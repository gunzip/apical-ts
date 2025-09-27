#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Pattern da correggere per gli esempi
const patterns = [
  // === 200 -> === "200"
  {
    regex: /===\s*(\d{3})(\s*[;&)\s])/g,
    replacement: '=== "$1"$2',
  },
  // case 200: -> case "200":
  {
    regex: /case\s+(\d{3}):/g,
    replacement: 'case "$1":',
  },
  // .status).toBe("number") -> .toBe("string")
  {
    regex: /typeof\s+\w+\.status\)\s*\.toBe\("number"\)/g,
    replacement: 'typeof response.status).toBe("string")',
  },
  // status: number -> status: string (nei type definitions)
  {
    regex: /status:\s*number(\s*[|;,}])/g,
    replacement: "status: string$1",
  },
  // { status: 200 } -> { status: "200" }
  {
    regex: /{\s*status:\s*(\d{3})\s*}/g,
    replacement: '{ status: "$1" }',
  },
  // status property in server examples
  {
    regex: /status:\s*(\d{3})(\s*[,;}])/g,
    replacement: 'status: "$1"$2',
  },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  patterns.forEach((pattern) => {
    const originalContent = content;
    content = content.replace(pattern.regex, pattern.replacement);
    if (content !== originalContent) {
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function findFiles(dir, extension = ".ts") {
  const files = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        if (!item.startsWith(".") && item !== "node_modules") {
          walk(itemPath);
        }
      } else if (item.endsWith(extension)) {
        files.push(itemPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Trova tutti i file negli esempi
const examplesDir = path.join(process.cwd(), "apps/examples");
const exampleFiles = findFiles(examplesDir);

console.log(`Found ${exampleFiles.length} example files`);

let fixedCount = 0;
exampleFiles.forEach((file) => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
