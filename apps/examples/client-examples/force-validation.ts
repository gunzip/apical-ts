import {
  configureOperations,
  globalConfig,
  isParsed,
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
  if (
    lazyPetsResponse.isValid === true &&
    lazyPetsResponse.status === 200 &&
    "parse" in lazyPetsResponse
  ) {
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
  if (
    petsResponse1.isValid === true &&
    petsResponse1.status === 200 &&
    "parse" in petsResponse1
  ) {
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
  if (
    greedyPetResponse.isValid === true &&
    greedyPetResponse.status === 200 &&
    "parsed" in greedyPetResponse
  ) {
    // automatic validation: .parsed available
    greedyPetResponse.parsed[0].name;
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
  if (
    petsResponse2.isValid === true &&
    petsResponse2.status === 200 &&
    "parsed" in petsResponse2
  ) {
    // bound automatic validation: .parsed available
    petsResponse2.parsed;
  }
}

demonstrateClient();
