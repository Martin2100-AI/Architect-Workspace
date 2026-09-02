import fs from 'fs';

export interface PromptTemplate {
  fill(values: Record<string, unknown>): string;
}

/**
 * Loads a scored prompt file from prompts/<name>/vX.Y.Z.md (this repo's versioned
 * prompt library — see prompts/CONTRIBUTING.md) and strips its frontmatter header,
 * leaving the Instructions/Input/Output format sections that actually get sent to
 * Claude. Loading the real scored file, rather than a hand-copied TypeScript
 * string, means production always runs exactly what scripts/score_prompt.py
 * evaluated — no risk of the two drifting apart.
 */
export function loadPromptTemplate(promptFilePath: string): PromptTemplate {
  const fullText = fs.readFileSync(promptFilePath, 'utf-8');
  const body = stripFrontmatter(fullText);

  return {
    fill(values: Record<string, unknown>): string {
      return fillPlaceholders(body, values);
    },
  };
}

function stripFrontmatter(text: string): string {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') {
    return text;
  }
  const closingIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (closingIndex === -1) {
    return text;
  }
  return lines.slice(closingIndex + 2).join('\n');
}

// Mirrors scripts/score_prompt.py's fill_template exactly: every {{field}} token
// is replaced with the JSON-encoded value (so strings arrive quoted, objects
// arrive as JSON) — the same substitution the prompt was actually scored against.
function fillPlaceholders(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in values)) {
      throw new Error(`Prompt template references {{${key}}} but no value was provided for it`);
    }
    return JSON.stringify(values[key]);
  });
}
