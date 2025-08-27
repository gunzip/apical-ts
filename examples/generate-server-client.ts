#!/usr/bin/env tsx
/* Script to generate both server and client code from OpenAPI spec */

import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";

const OPENAPI_FILE = "./openapi.yaml";
const OUTPUT_DIR = "./generated";

async function main() {
  try {
    console.log("🚀 Generating server and client code from OpenAPI spec...");
    
    /* Clean up any existing generated code */
    try {
      await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
      console.log("✅ Cleaned up existing generated code");
    } catch (error) {
      /* Directory might not exist, which is fine */
    }

    /* Run the generator with both server and client flags */
    const generateCommand = [
      "pnpm start generate",
      `--input ${OPENAPI_FILE}`,
      `--output ${OUTPUT_DIR}`,
      "--generate-server",
      "--generate-client"
    ].join(" ");

    console.log("📦 Running:", generateCommand);
    
    execSync(generateCommand, { 
      stdio: "inherit", 
      cwd: path.join(__dirname, "..") /* Run from project root */
    });

    console.log("✅ Code generation completed successfully!");
    console.log(`📁 Generated files in: ${OUTPUT_DIR}/`);
    
    /* List the generated structure */
    const generatedContents = await fs.readdir(OUTPUT_DIR);
    console.log("📋 Generated structure:");
    for (const item of generatedContents) {
      console.log(`  - ${item}`);
      
      const itemPath = path.join(OUTPUT_DIR, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        const subContents = await fs.readdir(itemPath);
        for (const subItem of subContents.slice(0, 5)) {
          console.log(`    - ${subItem}`);
        }
        if (subContents.length > 5) {
          console.log(`    ... and ${subContents.length - 5} more files`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}