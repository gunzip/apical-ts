// Quick test to verify the default validation behavior has changed
console.log("Testing default forceValidation behavior...");

// Read the generated config file
const fs = require("fs");
const configPath = "./apps/examples/generated/client/config.ts";

if (fs.existsSync(configPath)) {
  const content = fs.readFileSync(configPath, "utf8");

  // Check if the default is now true
  if (content.includes("forceValidation: true")) {
    console.log("✅ SUCCESS: Default forceValidation is now true");
  } else if (content.includes("forceValidation: false")) {
    console.log("❌ FAIL: Default forceValidation is still false");
  } else {
    console.log("❓ UNKNOWN: Could not find forceValidation setting");
  }

  // Check if function signatures use the new default
  const findPetsPath = "./apps/examples/generated/client/findPetsByStatus.ts";
  if (fs.existsSync(findPetsPath)) {
    const functionContent = fs.readFileSync(findPetsPath, "utf8");

    if (functionContent.includes("TForceValidation extends boolean = true")) {
      console.log("✅ SUCCESS: Function signatures now default to true");
    } else if (
      functionContent.includes("TForceValidation extends boolean = false")
    ) {
      console.log("❌ FAIL: Function signatures still default to false");
    } else {
      console.log(
        "❓ UNKNOWN: Could not find TForceValidation in function signature"
      );
    }
  }
} else {
  console.log("❌ FAIL: Generated config file not found");
}
