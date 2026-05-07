import type { ExtensionAPI, LoadSkillsResult } from "@earendil-works/pi-coding-agent";
import { loadSkills, SettingsManager } from "@earendil-works/pi-coding-agent";
import { fuzzyFilter } from "@earendil-works/pi-tui";

type SkillInfo = Pick<LoadSkillsResult["skills"][number], "name" | "description" | "source">;

const MAX_SUGGESTIONS = 10;
const MAX_SKILL_NAME_LENGTH = 64;
const SKILL_NAME_PATTERN = `[a-z0-9-]{0,${MAX_SKILL_NAME_LENGTH}}`;
const SKILL_QUERY_REGEX = new RegExp(`(?:^|\\s)\\$(${SKILL_NAME_PATTERN})$`);

const normalizeToSingleLine = (text: string) => text.replace(/[\r\n]+/g, " ").trim();

function buildSkillIndex(cwd: string): SkillInfo[] {
  const settings = SettingsManager.create(cwd);
  const result: LoadSkillsResult = loadSkills({ cwd, skillPaths: settings.getSkillPaths() });
  return result.skills.slice();
}

function findDollarPrefix(line: string, col: number): { prefix: string; query: string } | null {
  const beforeCursor = line.slice(0, col);
  const match = beforeCursor.match(SKILL_QUERY_REGEX);
  if (!match) return null;

  const query = match[1] ?? "";
  return { prefix: `$${query}`, query };
}

export default function (pi: ExtensionAPI) {
  let skills: SkillInfo[] = [];

  pi.on("session_start", async (_event, ctx) => {
    skills = buildSkillIndex(ctx.cwd);

    if (!ctx.hasUI) return;

    ctx.ui.addAutocompleteProvider((current) => ({
      async getSuggestions(lines, line, col, options) {
        const context = findDollarPrefix(lines[line] ?? "", col);
        if (!context) return current.getSuggestions(lines, line, col, options);

        const matches = context.query
          ? fuzzyFilter(skills, context.query, (skill) => skill.name)
          : skills;
        return {
          prefix: context.prefix,
          items: matches.slice(0, MAX_SUGGESTIONS).map((skill) => ({
            value: `$${skill.name}`,
            label: `$${skill.name}`,
            description: `${normalizeToSingleLine(skill.description)} (${skill.source})`,
          })),
        };
      },

      applyCompletion(lines, line, col, item, prefix) {
        return current.applyCompletion(lines, line, col, item, prefix);
      },

      shouldTriggerFileCompletion(lines, line, col) {
        return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
      },
    }));
  });
}
