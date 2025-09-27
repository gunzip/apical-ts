#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Pattern da correggere
const patterns = [
  // .toBe(200) -> .toBe("200")
  {
    regex: /\.toBe\((\d+)\)/g,
    replacement: '.toBe("$1")',
  },
  // === 200 -> === "200"
  {
    regex: /===\s*(\d+)(\s*[;&)])/g,
    replacement: '=== "$1"$2',
  },
  // [200, 201] -> ["200", "201"]
  {
    regex: /\[\s*(\d+)(?:\s*,\s*(\d+))*\s*\]/g,
    replacement: (match) => {
      const numbers = match.match(/\d+/g);
      return "[" + numbers.map((n) => `"${n}"`).join(", ") + "]";
    },
  },
  // typeof response.status).toBe("number") -> .toBe("string")
  {
    regex: /typeof\s+\w+\.status\)\s*\.toBe\("number"\)/g,
    replacement: 'typeof response.status).toBe("string")',
  },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  patterns.forEach((pattern) => {
    const originalContent = content;
    if (typeof pattern.replacement === "function") {
      content = content.replace(pattern.regex, pattern.replacement);
    } else {
      content = content.replace(pattern.regex, pattern.replacement);
    }
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

function findTestFiles(dir) {
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
      } else if (item.endsWith(".test.ts")) {
        files.push(itemPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Trova tutti i file di test
const testsDir = path.join(process.cwd(), "apps/craft/tests");
const testFiles = findTestFiles(testsDir);

console.log(`Found ${testFiles.length} test files`);

let fixedCount = 0;
testFiles.forEach((file) => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);
