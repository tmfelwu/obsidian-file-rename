import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, normalizePath } from "obsidian";

type PositionOption = "prepend" | "append";
type DateSourceOption = "now" | "created" | "modified";
type ConflictStrategy = "append-counter" | "skip";

interface RenamePluginSettings {
  dateFormat: string;
  separator: string;
  avoidDuplicatePrefix: boolean; // legacy key, now treated as avoidDuplicateDate
  position: PositionOption;
  dateSource: DateSourceOption;
  conflictStrategy: ConflictStrategy;
  markdownOnly: boolean;
}

const DEFAULT_SETTINGS: RenamePluginSettings = {
  dateFormat: "YYYY-MM-DD",
  separator: " ",
  avoidDuplicatePrefix: true,
  position: "prepend",
  dateSource: "now",
  conflictStrategy: "append-counter",
  markdownOnly: true
};

export default class RenameFilePrependDatePlugin extends Plugin {
  private settings: RenamePluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "rename-with-date",
      name: "Rename: add date to current file",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.renameWithDate(file);
        return true;
      }
    });

    this.addSettingTab(new RenamePluginSettingTab(this.app, this));
  }

  onunload(): void {}

  private async renameWithDate(file: TFile): Promise<void> {
    try {
      if (this.settings.markdownOnly && file.extension !== "md") {
        new Notice("Rename skipped: only Markdown files are enabled in settings.");
        return;
      }

      const dateToUse = getDateForFile(file, this.settings.dateSource);
      const formattedDate = formatDate(dateToUse, this.settings.dateFormat);

      const currentBaseName = file.basename;
      const sep = this.settings.separator ?? "";

      let newBaseName = currentBaseName;
      if (this.settings.position === "prepend") {
        const prefix = formattedDate + sep;
        if (this.settings.avoidDuplicatePrefix && currentBaseName.startsWith(prefix)) {
          new Notice("Date already present at start of name.");
          return;
        }
        newBaseName = `${prefix}${currentBaseName}`;
      } else {
        const suffix = sep + formattedDate;
        if (this.settings.avoidDuplicatePrefix && currentBaseName.endsWith(suffix)) {
          new Notice("Date already present at end of name.");
          return;
        }
        newBaseName = `${currentBaseName}${suffix}`;
      }

      let targetPath = buildSiblingPathWithNewBase(file, newBaseName);
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing) {
        if (this.settings.conflictStrategy === "skip") {
          new Notice("Rename skipped: target already exists.");
          return;
        }
        if (this.settings.conflictStrategy === "append-counter") {
          const uniqueBase = await this.generateUniqueBaseName(file, newBaseName);
          targetPath = buildSiblingPathWithNewBase(file, uniqueBase);
        }
      }

      await this.app.fileManager.renameFile(file, targetPath);
      const finalName = targetPath.split("/").pop() ?? newBaseName;
      new Notice(`Renamed to: ${finalName}`);
    } catch (error) {
      console.error("Failed to rename file", error);
      new Notice("Failed to rename file. See console for details.");
    }
  }

  private async generateUniqueBaseName(file: TFile, baseName: string): Promise<string> {
    const directoryPath = file.parent?.path ?? "/";
    const extensionPart = file.extension ? `.${file.extension}` : "";
    let counter = 1;
    let candidateBase = baseName;
    while (true) {
      const candidatePath = normalizePath(`${directoryPath === "/" ? "" : directoryPath + "/"}${candidateBase}${extensionPart}`);
      const exists = this.app.vault.getAbstractFileByPath(candidatePath);
      if (!exists) return candidateBase;
      counter += 1;
      candidateBase = `${baseName} (${counter})`;
      if (counter > 5000) throw new Error("Too many conflicting files when generating a unique name");
    }
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // Settings accessors for the settings tab
  getSettings(): RenamePluginSettings {
    return this.settings;
  }

  async updateSettings(partial: Partial<RenamePluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    await this.saveSettings();
  }
}

class RenamePluginSettingTab extends PluginSettingTab {
  private plugin: RenameFilePrependDatePlugin;

  constructor(app: App, plugin: RenameFilePrependDatePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Rename with Date" });

    new Setting(containerEl)
      .setName("Position")
      .setDesc("Place the date before or after the original name")
      .addDropdown((dd) =>
        dd
          .addOptions({ prepend: "Prepend", append: "Append" })
          .setValue(this.plugin.getSettings().position)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ position: (value as PositionOption) });
          })
      );

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Tokens: YYYY, MM, DD, HH, mm, ss")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.getSettings().dateFormat)
          .onChange(async (value) => {
            const sanitized = value.trim() || DEFAULT_SETTINGS.dateFormat;
            await this.plugin.updateSettings({ dateFormat: sanitized });
          })
      );

    new Setting(containerEl)
      .setName("Date source")
      .setDesc("Choose which date to use when renaming")
      .addDropdown((dd) =>
        dd
          .addOptions({ now: "Current time", created: "File created", modified: "File modified" })
          .setValue(this.plugin.getSettings().dateSource)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ dateSource: (value as DateSourceOption) });
          })
      );

    new Setting(containerEl)
      .setName("Separator after date")
      .setDesc("Text inserted between date and original file name.")
      .addText((text) =>
        text
          .setPlaceholder(" ")
          .setValue(this.plugin.getSettings().separator)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ separator: value });
          })
      );

    new Setting(containerEl)
      .setName("Avoid duplicate date")
      .setDesc("If the date is already at the chosen position, do nothing.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.getSettings().avoidDuplicatePrefix)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ avoidDuplicatePrefix: value });
          })
      );

    new Setting(containerEl)
      .setName("Name conflict strategy")
      .setDesc("What to do if a file with the target name already exists")
      .addDropdown((dd) =>
        dd
          .addOptions({ "append-counter": "Append counter (1, 2, 3)", skip: "Skip" })
          .setValue(this.plugin.getSettings().conflictStrategy)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ conflictStrategy: (value as ConflictStrategy) });
          })
      );

    new Setting(containerEl)
      .setName("Markdown files only")
      .setDesc("Limit renames to .md notes")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.getSettings().markdownOnly)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ markdownOnly: value });
          })
      );
  }
}

function buildSiblingPathWithNewBase(file: TFile, newBaseName: string): string {
  const directoryPath = file.parent?.path ?? "/";
  const extensionPart = file.extension ? `.${file.extension}` : "";
  const newPath = `${directoryPath === "/" ? "" : directoryPath + "/"}${newBaseName}${extensionPart}`;
  return normalizePath(newPath);
}

function pad(number: number, width: number): string {
  const s = String(number);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function formatDate(date: Date, pattern: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate(); // 1-31
  const hours = date.getHours(); // 0-23
  const minutes = date.getMinutes(); // 0-59
  const seconds = date.getSeconds(); // 0-59

  // Support common tokens
  const replacements: Record<string, string> = {
    YYYY: String(year),
    MM: pad(month, 2),
    DD: pad(day, 2),
    HH: pad(hours, 2),
    mm: pad(minutes, 2),
    ss: pad(seconds, 2)
  };

  let result = pattern;
  for (const token of Object.keys(replacements)) {
    result = result.split(token).join(replacements[token]);
  }
  return result;
}

function getDateForFile(file: TFile, source: DateSourceOption): Date {
  if (source === "created") return new Date(file.stat.ctime);
  if (source === "modified") return new Date(file.stat.mtime);
  return new Date();
}


