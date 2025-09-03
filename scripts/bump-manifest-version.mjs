import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

const args = new Set(process.argv.slice(2));
const DO_WRITE = args.has("--write");
const SHOW_ONLY = args.has("--check");

async function main() {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  const versionsPath = "versions.json";
  const nextVersion = pkg.version;

  const before = { manifestVersion: manifest.version };
  manifest.version = nextVersion;

  let versions = {};
  if (existsSync(versionsPath)) {
    versions = JSON.parse(await readFile(versionsPath, "utf8"));
  }
  const minApp = manifest.minAppVersion || "1.0.0";
  versions[nextVersion] = minApp;

  if (SHOW_ONLY && !DO_WRITE) {
    console.log("Will set manifest.json version:", before.manifestVersion, "->", nextVersion);
    if (!before.manifestVersion || before.manifestVersion !== nextVersion) {
      console.log("versions.json will be updated with:", nextVersion, "->", minApp);
    }
    return;
  }

  await writeFile("manifest.json", JSON.stringify(manifest, null, 2) + "\n", "utf8");
  await writeFile(versionsPath, JSON.stringify(versions, null, 2) + "\n", "utf8");
  console.log("Updated manifest.json and versions.json to", nextVersion);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
