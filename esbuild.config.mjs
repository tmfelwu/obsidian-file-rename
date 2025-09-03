import esbuild from "esbuild";

const isProd = process.argv.includes("--prod");
const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: ["main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2020"],
  outfile: "main.js",
  sourcemap: isProd ? false : "inline",
  external: ["obsidian"],
  minify: isProd
};

if (isWatch && !isProd) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes… (Ctrl+C to stop)");
} else {
  await esbuild.build(buildOptions);
  console.log(`Built plugin (${isProd ? "production" : "development"})`);
}

