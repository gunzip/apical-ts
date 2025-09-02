import {
  configureOperations,
  globalConfig,
} from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";

async function demonstrateClient() {
  // Manual validation bound client
  // default configuration forceValidation=false
  const lazyPetsResponse = await findPetsByStatus({
    query: { status: "available" },
  });
  if (lazyPetsResponse.success === true && lazyPetsResponse.status === 200) {
    lazyPetsResponse.parse();
  }

  // Manual validation bound client
  // using configureOperation with forceValidation=false
  const lazyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: false },
  );
  const petsResponse1 = await lazyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse1.success === true && petsResponse1.status === 200) {
    petsResponse1.parse();
  }

  // Automatic validation bound client
  // overridden per op configuration forceValidation=true
  const greedyPetResponse = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    { ...globalConfig, forceValidation: true },
  );
  if (greedyPetResponse.success === true && greedyPetResponse.status === 200) {
    // automatic validation: .parsed available
    greedyPetResponse.parsed;
  }

  // Automatic validation bound client
  // with configureOperation and forceValidation=true
  const greedyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: true },
  );
  const petsResponse2 = await greedyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse2.success === true && petsResponse2.status === 200) {
    // bound automatic validation: .parsed available
    petsResponse2.parsed;
  }
}

demonstrateClient();
