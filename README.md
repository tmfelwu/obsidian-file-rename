# Rename File: Prepend Date (Obsidian Plugin)

Rename the current note by prepending a configurable date string (default `YYYY-MM-DD`).

## Features
- Prepend formatted date to the active file's name
- Configurable date format and separator
- Option to avoid adding duplicate date prefixes
- Command palette command + hotkey support

## Install (development)
1. Ensure Node.js 18+ is installed.
2. In this folder, install deps and build once:
```bash
npm install
npm run build
```
3. In Obsidian, enable community plugins and turn on "Rename File: Prepend Date".

## Usage
- Run the command: "Prepend date to current file name" from the command palette.
- Or bind a hotkey: Settings → Hotkeys → search for "Prepend date" and add your preferred shortcut.

## Settings
- Position: put the date at the start (prepend) or end (append).
- Date format: tokens `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss` are supported.
- Date source: use current time, file created time, or file modified time.
- Separator: text between date and original base name.
- Avoid duplicate date: skip if the same date is already present at position.
- Name conflict strategy: append counter (1, 2, 3) or skip.
- Markdown files only: if on, only `.md` files are renamed.

## Build for release
```bash
npm run build
```
This generates `main.js` and (in dev mode) inline source maps.

## Live dev (watch)
To rebuild on save during development:
```bash
npm run dev
```
Then reload the plugin in Obsidian (toggle off/on) or use a reloader plugin.

## Publishing & Community submission
1) Prepare repository
```bash
git init
git remote add origin git@github.com:tmfelwu/obsidian-file-rename.git
git add .
git commit -m "chore: initial commit"
git branch -M main
git push -u origin main
```

2) Versioning and release
- Update `package.json` version (semver), then run:
```bash
npm run release
git tag -a v$(node -p "require('./package.json').version") -m "Release"
git push --follow-tags
```
- A GitHub Actions workflow will build and create a draft release with `manifest.json` and `main.js`. Publish the draft.

3) Submit to Obsidian Community Plugins
- Fork `obsidianmd/obsidian-releases`.
- Add an entry to `community-plugins.json` with:
  - `id`: `rename-file-prepend-date`
  - `name`: "Rename File: Prepend Date"
  - `author`: your name
  - `repo`: `tmfelwu/obsidian-file-rename`
- Create a PR. After merge, your plugin appears in Community Plugins.

Notes
- `versions.json` maps plugin versions to min app version.
- `scripts/bump-manifest-version.mjs` syncs `manifest.json` version to `package.json` and updates `versions.json`.

## License
MIT
