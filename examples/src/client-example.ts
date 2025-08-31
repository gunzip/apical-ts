/* eslint-disable no-console */
/* Minimal client example that calls the Express server using generated client */

import {
  configureOperations,
  globalConfig,
  isParsed,
} from "../generated/client/config.js";
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

  // default configuration forceValidation=false
  const petsResponse = await findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse.success === true && petsResponse.status === 200) {
    petsResponse.parse();
  }

  // overridden configuration forceValidation=true
  const petsResponse2 = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    { ...globalConfig, forceValidation: true },
  );
  if (petsResponse2.success === true && petsResponse2.status === 200) {
    // automatic validation: .parsed available
    petsResponse2.parsed;
  }

  // with configureOperation and forceValidation=true
  const api = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...localConfig, forceValidation: true },
  );
  const petsResponse3 = await api.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse3.success === true && petsResponse3.status === 200) {
    // bound automatic validation: .parsed available
    petsResponse3.parsed;
  }

  // with configureOperation and forceValidation=false
  const api2 = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...localConfig, forceValidation: false },
  );
  const petsResponse4 = await api2.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse4.success === true && petsResponse4.status === 200) {
    petsResponse4.parse();
  }
}

/* Handle graceful shutdown */
process.on("SIGINT", () => {
  console.log("\n👋 Client demonstration interrupted");
  process.exit(0);
});

/* Main execution */
demonstrateClient();

export { demonstrateClient };
