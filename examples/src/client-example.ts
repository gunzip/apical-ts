/* eslint-disable no-console */
/* Minimal client example that calls the Express server using generated client */

import { globalConfig } from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";

/* Configure client to point to our local Express server */
const localConfig = {
  ...globalConfig,
  baseURL: "http://localhost:3000",
};

async function demonstrateClient() {
  console.log("🔌 Starting client demonstration...");
  console.log(
    "📡 Configured to call local Express server at:",
    localConfig.baseURL,
  );
  console.log("");

  try {
    /* Example 1: Find pets by status */
    console.log("1️⃣ Finding pets with status 'available'...");
    const petsResponse = await findPetsByStatus(
      {
        query: { status: "available" },
      },
      localConfig,
    );

    if (petsResponse.status === 200) {
      console.log(
        "✅ Found pets (raw):",
        JSON.stringify(petsResponse.data, null, 2),
      );

      /* Parse the response data to get type-safe access */
      const parseResult = petsResponse.parse();
      if ("parsed" in parseResult) {
        console.log(
          "🔍 Parsed data (type-safe):",
          JSON.stringify(parseResult.parsed, null, 2),
        );
        console.log(`📊 Found ${parseResult.parsed.length} pets`);
      } else if ("error" in parseResult) {
        console.error("❌ Failed to parse response:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to find pets:", petsResponse.status);
    }

    console.log("");

    /* Example 2: Get specific pet by ID */
    console.log("2️⃣ Getting pet with ID 1...");
    const petResponse = await getPetById(
      {
        headers: { api_key: "demo-api-key" } /* Provide a demo API key */,
        path: { petId: "1" },
      },
      localConfig,
    );

    if (petResponse.status === 200) {
      console.log("✅ Found pet:", JSON.stringify(petResponse.data, null, 2));

      /* Parse the response data */
      const parseResult = petResponse.parse();
      if ("parsed" in parseResult) {
        const pet = parseResult.parsed;
        console.log(`🐕 Pet details: ${pet.name} (${pet.status})`);
        if (pet.category) {
          console.log(`🏷️ Category: ${pet.category.name}`);
        }
      } else if ("error" in parseResult) {
        console.error("❌ Failed to parse pet data:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to get pet:", petResponse.status);
    }

    console.log("");

    /* Example 3: Get inventory */
    console.log("3️⃣ Getting store inventory...");
    const inventoryResponse = await getInventory(
      {
        headers: { api_key: "demo-api-key" },
      },
      localConfig,
    );

    if (inventoryResponse.status === 200) {
      console.log(
        "✅ Inventory:",
        JSON.stringify(inventoryResponse.data, null, 2),
      );

      /* Parse the response data */
      const parseResult = inventoryResponse.parse();
      if ("parsed" in parseResult) {
        const inventory = parseResult.parsed;
        console.log("📦 Inventory summary:");
        for (const [status, count] of Object.entries(inventory)) {
          console.log(`  ${status}: ${count}`);
        }
      } else if ("error" in parseResult) {
        console.error("❌ Failed to parse inventory:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to get inventory:", inventoryResponse.status);
    }

    console.log("");

    /* Example 4: Error handling - try to get non-existent pet */
    console.log(
      "4️⃣ Testing error handling - getting non-existent pet (ID 999)...",
    );
    const nonExistentPetResponse = await getPetById(
      {
        headers: { api_key: "demo-api-key" },
        path: { petId: "999" },
      },
      localConfig,
    );

    if (nonExistentPetResponse.status === 404) {
      console.log("✅ Correctly received 404 for non-existent pet");
    } else {
      console.log("🤔 Unexpected response:", nonExistentPetResponse.status);
    }
  } catch (error) {
    console.error("❌ Error during client demonstration:", error);

    /* Check if it's a network error */
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.log("");
      console.log("💡 It looks like the Express server is not running.");
      console.log("   Please start the server first:");
      console.log("   npx tsx src/express-server-example.ts");
    }
  }

  /* Example 5: Unexpected - send invalid parameters in getInventory */
  console.log("5️⃣ Testing error handling - sending invalid parameters...");

  // use native fetch since generated client cannot send invalid parameters
  const invalidInventoryResponse = await fetch(
    "http://localhost:3000/store/inventory?invalidParam=invalid",
    {
      method: "GET",
      headers: { foo: "demo-api-key" },
    },
  );

  // @ts-ignore
  if (invalidInventoryResponse.status === 400) {
    console.log("✅ Correctly received 400 for invalid parameters");
  } else {
    console.log("🤔 Unexpected response:", invalidInventoryResponse.status);
  }

  console.log("");
  console.log("🏁 Client demonstration completed!");
}

/* Handle graceful shutdown */
process.on("SIGINT", () => {
  console.log("\n👋 Client demonstration interrupted");
  process.exit(0);
});

/* Main execution */
demonstrateClient();

export { demonstrateClient };
