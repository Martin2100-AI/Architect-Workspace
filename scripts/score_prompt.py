#!/usr/bin/env python3
# score_prompt.py
#
# What this does, in plain English:
# You give it two files: a prompt (with {{placeholders}} like {{listingPrice}})
# and an eval.jsonl file (one test case per line, each with "input" and "expected").
# For every test case, it fills the placeholders into the prompt, sends the result
# to Claude, reads back a JSON answer, and checks whether that answer matches
# "expected" on the fields you care about. At the end it prints a score.
#
# Usage:
#   python scripts/score_prompt.py <path-to-prompt-file> <path-to-eval.jsonl>

import os
import re
import sys
import json
import argparse

# --- Settings you might want to tweak later ---
MODEL_NAME = "claude-sonnet-5"   # which Claude model answers each test case
MAX_TOKENS = 300                 # answers here are short JSON objects, so this is plenty
NUMBER_TOLERANCE = 0.01          # how far a number can be off and still count as "matching"


def load_env_file(path=".env"):
    # Reads simple KEY=VALUE lines from a .env file into the environment.
    # This is hand-rolled on purpose so you don't need to install anything extra.
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Never overwrite a value the shell/OS already set for this run.
            os.environ.setdefault(key, value)


def fill_template(prompt_text, input_values):
    # Replaces every {{field_name}} in the prompt with the matching value from
    # the test case's "input" object. Strings get quotes, numbers don't, and
    # missing values become null -- the same rules JSON itself uses.
    def replace_one(match):
        field_name = match.group(1)
        if field_name not in input_values:
            raise KeyError(field_name)
        return json.dumps(input_values[field_name])

    return re.sub(r"\{\{(\w+)\}\}", replace_one, prompt_text)


def extract_json_object(text):
    # The model is supposed to answer with JSON, but it might add stray words
    # around it despite instructions. This tries a clean parse first, then
    # falls back to grabbing the first {...} block in the text.
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None


def values_match(expected_value, actual_value):
    # Compares one field the way we agreed:
    # - text: case-insensitive, ignore leading/trailing whitespace
    # - numbers: allow a small tolerance instead of requiring an exact match
    # - null: only matches null
    # - anything else: plain equality
    if expected_value is None:
        return actual_value is None

    if isinstance(expected_value, bool):
        return actual_value is expected_value

    if isinstance(expected_value, (int, float)):
        if not isinstance(actual_value, (int, float)) or isinstance(actual_value, bool):
            return False
        return abs(actual_value - expected_value) <= NUMBER_TOLERANCE

    if isinstance(expected_value, str):
        if not isinstance(actual_value, str):
            return False
        return actual_value.strip().lower() == expected_value.strip().lower()

    return actual_value == expected_value


def case_matches(expected, actual):
    # A case only passes if EVERY field named in "expected" matches.
    # Extra fields the model returns that aren't in "expected" are ignored.
    if actual is None:
        return False
    for field_name, expected_value in expected.items():
        if not values_match(expected_value, actual.get(field_name)):
            return False
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Score a prompt against a set of test cases (eval.jsonl)."
    )
    parser.add_argument("prompt_path", help="Path to the prompt file (contains {{placeholders}})")
    parser.add_argument("eval_path", help="Path to the eval.jsonl file (one test case per line)")
    args = parser.parse_args()

    # Check the two input files exist before doing anything else, so a typo'd
    # path gives a plain message instead of a crash halfway through.
    if not os.path.exists(args.prompt_path):
        print(f"No prompt file found at: {args.prompt_path}")
        print("Create that file (your prompt template) and run this again.")
        sys.exit(1)

    if not os.path.exists(args.eval_path):
        print(f"No eval file found at: {args.eval_path}")
        sys.exit(1)

    with open(args.prompt_path, "r", encoding="utf-8") as f:
        prompt_text = f.read()

    cases = []
    with open(args.eval_path, "r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                cases.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"Could not read line {line_number} of {args.eval_path} as JSON: {e}")
                sys.exit(1)

    if not cases:
        print(f"{args.eval_path} has no test cases in it.")
        sys.exit(1)

    # Load the API key from a .env file (if present), then check it's actually there.
    load_env_file()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("No Anthropic API key found.")
        print("This script looks for ANTHROPIC_API_KEY in a .env file at the project root")
        print('(a line like:  ANTHROPIC_API_KEY=sk-ant-...) or in your environment variables.')
        print("Add it and run this again.")
        sys.exit(1)

    try:
        import anthropic
    except ImportError:
        print("The 'anthropic' Python package isn't installed.")
        print("Install it with:  pip install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    results = []
    for index, case in enumerate(cases, start=1):
        input_values = case.get("input", {})
        expected = case.get("expected", {})
        case_id = input_values.get("id", f"case {index}")

        try:
            filled_prompt = fill_template(prompt_text, input_values)
        except KeyError as missing_field:
            print(f"Case {index} (id={case_id}): the prompt uses {{{{{missing_field}}}}} "
                  f"but this test case has no '{missing_field}' in its input. Skipping this case.")
            results.append({"id": case_id, "expected": expected, "actual": None, "passed": False})
            continue

        try:
            response = client.messages.create(
                model=MODEL_NAME,
                max_tokens=MAX_TOKENS,
                thinking={"type": "disabled"},  # this task is a short structured answer, not a reasoning task
                messages=[{"role": "user", "content": filled_prompt}],
            )
        except anthropic.AuthenticationError:
            print("Your Anthropic API key was rejected (authentication failed).")
            print("Double-check the ANTHROPIC_API_KEY value in your .env file -- it may be")
            print("missing a character, expired, or copied incorrectly.")
            print("No cases were scored.")
            sys.exit(1)
        except anthropic.APIError as e:
            print(f"Case {index} (id={case_id}): the request to Claude failed ({e}). Counting as not matched.")
            results.append({"id": case_id, "expected": expected, "actual": None, "passed": False})
            continue

        reply_text = "".join(block.text for block in response.content if block.type == "text")
        actual = extract_json_object(reply_text)
        passed = case_matches(expected, actual)
        results.append({
            "id": case_id,
            "expected": expected,
            "actual": actual if actual is not None else reply_text,
            "passed": passed,
        })

    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    score = passed_count / total_count if total_count else 0.0

    print()
    print(f"Model: {MODEL_NAME}")
    print(f"Cases run: {total_count}")
    print(f"Score: {score:.2f} ({passed_count}/{total_count} passed)")

    failed = [r for r in results if not r["passed"]]
    if failed:
        print()
        print("Failed cases:")
        for r in failed:
            print(f"  {r['id']}: expected {json.dumps(r['expected'])} but got {json.dumps(r['actual'])}")


if __name__ == "__main__":
    main()
