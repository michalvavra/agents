import type { ExtensionAPI, LoadSkillsResult } from "@mariozechner/pi-coding-agent";
import {
  CustomEditor,
  getSelectListTheme,
  loadSkills,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";
import { fuzzyFilter, Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

type SkillInfo = Pick<LoadSkillsResult["skills"][number], "name" | "description" | "source">;

interface DollarContext {
  query: string;
}

const WIDGET_ID = "skill-dollar-suggest";
const MAX_SUGGESTIONS = 5;
const MAX_SKILL_NAME_LENGTH = 64;
const SKILL_NAME_PATTERN = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SKILL_MENTION_REGEX = new RegExp(`\\$(${SKILL_NAME_PATTERN})`, "g");
const SKILL_QUERY_REGEX = new RegExp(`\\$([a-z0-9-]{0,${MAX_SKILL_NAME_LENGTH}})$`);

const normalizeToSingleLine = (text: string) => text.replace(/[\r\n]+/g, " ").trim();

function buildSkillIndex(cwd: string): SkillInfo[] {
  const settings = SettingsManager.create(cwd);
  const result: LoadSkillsResult = loadSkills({ cwd, skillPaths: settings.getSkillPaths() });
  return result.skills.slice();
}

function findDollarContext(
  text: string,
  cursor: { line: number; col: number },
): DollarContext | null {
  const lines = text.split("\n");
  const lineText = lines[cursor.line] ?? "";
  const linePrefix = lineText.slice(0, cursor.col);
  const match = linePrefix.match(SKILL_QUERY_REGEX);
  if (!match) return null;

  return { query: match[1] };
}

function renderSkillSuggestions(
  width: number,
  matches: SkillInfo[],
  selectedIndex: number,
  theme: ReturnType<typeof getSelectListTheme>,
): string[] {
  const lines: string[] = [];
  if (matches.length === 0) return lines;

  const renderValue = (name: string, source: string, maxWidth: number, isSelected: boolean) => {
    const sourceWidth = 1 + visibleWidth(source);
    const availableWidth = Math.max(0, maxWidth - 1 - sourceWidth);
    const truncatedName = truncateToWidth(name, availableWidth, "");
    const nameText = isSelected ? theme.selectedText(truncatedName) : truncatedName;
    const text = `${theme.description("$")}${nameText}${theme.description(` (${source})`)}`;
    return { text, width: 1 + visibleWidth(truncatedName) + sourceWidth };
  };

  const maxVisible = Math.min(matches.length, MAX_SUGGESTIONS);
  const startIndex = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(maxVisible / 2), matches.length - maxVisible),
  );
  const endIndex = Math.min(startIndex + maxVisible, matches.length);

  for (let i = startIndex; i < endIndex; i++) {
    const skill = matches[i];
    if (!skill) continue;

    const isSelected = i === selectedIndex;
    const prefix = isSelected ? theme.selectedPrefix("→ ") : "  ";
    const prefixWidth = visibleWidth(prefix);
    const descriptionSingleLine = normalizeToSingleLine(skill.description);
    const columnWidth = Math.max(0, Math.min(32, width - prefixWidth - 2));
    const value = renderValue(skill.name, skill.source, columnWidth, isSelected);
    const spacing = " ".repeat(Math.max(1, columnWidth - value.width));
    const remainingWidth = width - prefixWidth - columnWidth - 1;

    if (remainingWidth > 5) {
      const truncatedDesc = truncateToWidth(descriptionSingleLine, remainingWidth, "");
      const line = prefix + value.text + spacing + theme.description(truncatedDesc);
      lines.push(truncateToWidth(line, width, ""));
      continue;
    }

    const line = prefix + value.text;
    lines.push(truncateToWidth(line, width, ""));
  }

  while (lines.length < MAX_SUGGESTIONS) {
    lines.push(" ");
  }

  const scrollText = `  (${selectedIndex + 1}/${matches.length})`;
  lines.push(theme.scrollInfo(truncateToWidth(scrollText, width - 2, "")));

  return lines;
}

class SkillSuggestEditor extends CustomEditor {
  private skills: SkillInfo[];
  private setWidget: (data: { matches: SkillInfo[]; selectedIndex: number } | undefined) => void;
  private suggestionQuery: string | null = null;
  private suggestionMatches: SkillInfo[] = [];
  private selectedIndex = 0;

  constructor(
    tui: ConstructorParameters<typeof CustomEditor>[0],
    theme: ConstructorParameters<typeof CustomEditor>[1],
    keybindings: ConstructorParameters<typeof CustomEditor>[2],
    skills: SkillInfo[],
    setWidget: (data: { matches: SkillInfo[]; selectedIndex: number } | undefined) => void,
  ) {
    super(tui, theme, keybindings);
    this.skills = skills;
    this.setWidget = setWidget;
  }

  handleInput(data: string): void {
    if (this.suggestionQuery !== null && this.suggestionMatches.length > 0) {
      if (matchesKey(data, Key.up)) {
        this.selectedIndex =
          this.selectedIndex === 0
            ? Math.max(0, this.suggestionMatches.length - 1)
            : this.selectedIndex - 1;
        this.updateWidget();
        return;
      }

      if (matchesKey(data, Key.down)) {
        this.selectedIndex =
          this.selectedIndex === this.suggestionMatches.length - 1 ? 0 : this.selectedIndex + 1;
        this.updateWidget();
        return;
      }

      if (matchesKey(data, Key.enter) || matchesKey(data, Key.tab)) {
        this.applySelection();
        return;
      }

      if (matchesKey(data, Key.escape)) {
        this.clearSuggestions();
        return;
      }
    }

    super.handleInput(data);
    this.updateSuggestions();
  }

  private applySelection(): void {
    const selection = this.suggestionMatches[this.selectedIndex];
    if (this.suggestionQuery === null || !selection) {
      this.clearSuggestions();
      return;
    }

    const queryLength = this.suggestionQuery.length;
    for (let i = 0; i < queryLength; i++) {
      super.handleInput("\x7f");
    }

    this.insertTextAtCursor(selection.name);

    this.clearSuggestions();
  }

  private updateSuggestions(): void {
    const skills = this.skills;
    if (skills.length === 0) {
      this.clearSuggestions();
      return;
    }

    const context = findDollarContext(this.getText(), this.getCursor());
    if (!context) {
      this.clearSuggestions();
      return;
    }

    const query = context.query;
    const matches = query ? fuzzyFilter(skills, query, (skill) => skill.name) : skills;

    if (matches.length === 0) {
      this.clearSuggestions();
      return;
    }

    const queryChanged = query !== this.suggestionQuery;
    this.suggestionQuery = query;
    this.suggestionMatches = matches;
    this.selectedIndex = queryChanged
      ? 0
      : Math.min(this.selectedIndex, this.suggestionMatches.length - 1);
    this.updateWidget();
  }

  private updateWidget(): void {
    if (this.suggestionQuery === null || this.suggestionMatches.length === 0) {
      this.setWidget(undefined);
      return;
    }

    this.setWidget({ matches: this.suggestionMatches, selectedIndex: this.selectedIndex });
  }

  private clearSuggestions(): void {
    this.suggestionQuery = null;
    this.suggestionMatches = [];
    this.selectedIndex = 0;
    this.setWidget(undefined);
  }
}

export default function (pi: ExtensionAPI) {
  let skills: SkillInfo[] = [];

  pi.on("session_start", async (_event, ctx) => {
    skills = buildSkillIndex(ctx.cwd);

    if (!ctx.hasUI) return;

    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      const setWidget = (data: { matches: SkillInfo[]; selectedIndex: number } | undefined) => {
        if (!data || data.matches.length === 0) {
          ctx.ui.setWidget(WIDGET_ID, undefined);
          return;
        }

        ctx.ui.setWidget(
          WIDGET_ID,
          () => {
            const selectListTheme = getSelectListTheme();
            return {
              render: (width: number) =>
                renderSkillSuggestions(width, data.matches, data.selectedIndex, selectListTheme),
              invalidate: () => undefined,
            };
          },
          { placement: "belowEditor" },
        );
      };

      return new SkillSuggestEditor(tui, theme, keybindings, skills, setWidget);
    });
  });
}
