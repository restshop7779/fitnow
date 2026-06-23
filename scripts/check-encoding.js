const fs = require("node:fs");
const path = require("node:path");

const roots = ["src", "scripts", "docs"];
const extraFiles = ["README.md", "SETUP.md", "DEV_NOTES.md", "SUPABASE_SETUP.md", "ROADMAP.md", "package.json"];
const checkedExtensions = new Set([".js", ".jsx", ".css", ".html", ".md", ".json"]);
const skippedDirectories = new Set(["node_modules", "dist", "business_plan_render"]);
const mojibakePattern = /[\uFFFD\u3400-\u9FFF\uF900-\uFAFF]/g;

function collectFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skippedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (checkedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function uniqueMatches(text) {
  return [...new Set(text.match(mojibakePattern) || [])].slice(0, 20);
}

const files = [
  ...extraFiles.filter((file) => fs.existsSync(file)),
  ...roots.flatMap((root) => collectFiles(root)),
];

const failures = files
  .map((file) => {
    const text = fs.readFileSync(file, "utf8");
    return { file, matches: uniqueMatches(text) };
  })
  .filter((result) => result.matches.length);

if (failures.length) {
  console.error("[encoding] Possible mojibake detected:");
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.matches.join(" ")}`);
  }
  process.exit(1);
}

console.log(`[encoding] OK: ${files.length} files`);
