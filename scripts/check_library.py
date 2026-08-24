#!/usr/bin/env python3
# check_library.py
#
# What this does, in plain English:
# Walks every folder under prompts/, finds each one's newest version file
# (v1.0.0.md, v1.1.0.md, etc.), and checks it against the "library-ready"
# rules written out in prompts/CONTRIBUTING.md: a versioned filename, a
# complete header, at least 3 test cases, a recorded score of 0.85 or
# higher, and a named model. It prints one row per prompt.
#
# Prompts still marked "draft" in their header are listed as drafts and are
# NOT checked against the rules -- drafts are allowed to be incomplete.
# Only prompts marked "ready" are graded pass/fail. If any of those fails,
# this script exits with an error, so a broken "ready" prompt can't slip by
# unnoticed (the same way a failing test blocks a build).
#
# Usage:
#   python scripts/check_library.py

import os
import re
import sys

PROMPTS_DIR = "prompts"
MIN_SCORE = 0.85
MIN_CASES = 3
REQUIRED_HEADER_FIELDS = [
    "name", "version", "purpose", "model", "inputs", "output", "last_eval", "status",
]
VERSION_FILE_PATTERN = re.compile(r"^v(\d+)\.(\d+)\.(\d+)\.md$")


def parse_header(text):
    # Pulls out the "--- ... ---" frontmatter block at the top of a prompt
    # file and turns it into a plain dict of field name -> value.
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    header = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        header[key.strip()] = value.strip()
    return header


def find_latest_version_file(folder_path):
    # Looks for files named like v1.0.0.md in a prompt folder and returns
    # the path to the one with the highest version number.
    best_path = None
    best_version = None
    for entry in os.listdir(folder_path):
        match = VERSION_FILE_PATTERN.match(entry)
        if not match:
            continue
        version = tuple(int(part) for part in match.groups())
        if best_version is None or version > best_version:
            best_version = version
            best_path = os.path.join(folder_path, entry)
    return best_path


def count_eval_cases(folder_path):
    # Counts non-empty lines in eval.jsonl. This can only confirm the file
    # HAS enough cases -- it can't confirm a human actually reviewed the
    # expected answers. That part is a human responsibility, not a script's.
    eval_path = os.path.join(folder_path, "eval.jsonl")
    if not os.path.exists(eval_path):
        return 0
    count = 0
    with open(eval_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                count += 1
    return count


def extract_score(last_eval_value):
    # last_eval looks like "2026-08-24 - 1.00 (7/7 passed)". Pulls out the
    # 1.00. Returns None if no number can be found.
    match = re.search(r"(\d+\.\d+)", last_eval_value)
    if not match:
        return None
    return float(match.group(1))


def check_prompt(folder_path):
    # Returns one row describing a single prompt: name, version, model,
    # score, header status, and a result of "draft", "pass", or "fail"
    # (with reasons attached when it fails).
    name = os.path.basename(folder_path)
    version_file = find_latest_version_file(folder_path)

    if version_file is None:
        return {
            "name": name, "version": "-", "model": "-", "score": "-", "status": "-",
            "result": "fail",
            "reasons": ["no version file (vX.Y.Z.md) found in this folder"],
        }

    with open(version_file, "r", encoding="utf-8") as f:
        text = f.read()
    header = parse_header(text)

    filename = os.path.basename(version_file)
    header_status = header.get("status", "")
    model = header.get("model", "")
    version_field = header.get("version", "")
    last_eval = header.get("last_eval", "")
    score = extract_score(last_eval) if last_eval else None

    row = {
        "name": name,
        "version": version_field or filename,
        "model": model or "-",
        "score": f"{score:.2f}" if score is not None else "-",
        "status": header_status or "-",
    }

    if header_status != "ready":
        # Drafts aren't held to the library-ready bar -- that's the point
        # of a draft. Just report what's there.
        row["result"] = "draft"
        row["reasons"] = []
        return row

    # This prompt claims to be library-ready, so check it against every
    # rule from prompts/CONTRIBUTING.md.
    reasons = []

    if not VERSION_FILE_PATTERN.match(filename):
        reasons.append(f"filename '{filename}' isn't a version number like v1.0.0.md")

    for field in REQUIRED_HEADER_FIELDS:
        if not header.get(field, "").strip():
            reasons.append(f"header field '{field}' is blank")

    case_count = count_eval_cases(folder_path)
    if case_count < MIN_CASES:
        reasons.append(f"only {case_count} test case(s) in eval.jsonl, needs at least {MIN_CASES}")

    if score is None:
        reasons.append("last_eval has no readable score")
    elif score < MIN_SCORE:
        reasons.append(f"score {score:.2f} is below the required {MIN_SCORE}")

    if not model.strip():
        reasons.append("no model recorded")

    row["result"] = "pass" if not reasons else "fail"
    row["reasons"] = reasons
    return row


def print_table(rows):
    col_keys = ["name", "version", "model", "score", "status", "result"]
    col_labels = {
        "name": "name", "version": "version", "model": "model",
        "score": "score", "status": "status", "result": "pass/fail",
    }
    widths = {
        key: max(len(col_labels[key]), max(len(str(row[key])) for row in rows))
        for key in col_keys
    }

    def format_row(values):
        return "  ".join(str(values[key]).ljust(widths[key]) for key in col_keys)

    print(format_row(col_labels))
    print(format_row({key: "-" * widths[key] for key in col_keys}))
    for row in rows:
        print(format_row(row))


def main():
    if not os.path.isdir(PROMPTS_DIR):
        print(f"No '{PROMPTS_DIR}' folder found here. Run this from the project root.")
        sys.exit(1)

    rows = []
    for entry in sorted(os.listdir(PROMPTS_DIR)):
        folder_path = os.path.join(PROMPTS_DIR, entry)
        if not os.path.isdir(folder_path) or entry.startswith("_"):
            continue
        rows.append(check_prompt(folder_path))

    if not rows:
        print(f"No prompt folders found under {PROMPTS_DIR}/.")
        sys.exit(0)

    print_table(rows)

    any_failures = False
    for row in rows:
        if row["result"] == "fail":
            any_failures = True
            print()
            print(f"{row['name']} claims to be library-ready but fails:")
            for reason in row["reasons"]:
                print(f"  - {reason}")

    ready_count = sum(1 for r in rows if r["result"] == "pass")
    draft_count = sum(1 for r in rows if r["result"] == "draft")
    fail_count = sum(1 for r in rows if r["result"] == "fail")

    print()
    print(f"{len(rows)} prompt(s) checked: {ready_count} library-ready, {draft_count} draft, {fail_count} failing.")

    if any_failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
