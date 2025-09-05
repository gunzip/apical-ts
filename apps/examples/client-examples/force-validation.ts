import {
  configureOperations,
  globalConfig,
  isParsed,
} from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";

async function demonstrateClient() {
  // Automatic validation bound client
  // default configuration forceValidation=true
  const greedyPetsResponse = await findPetsByStatus({
    query: { status: "available" },
  });
  if (
    greedyPetsResponse.isValid === true &&
    greedyPetsResponse.status === 200
  ) {
    // automatic validation: .parsed available
    greedyPetsResponse.parsed[0].name;
  }

  // Automatic validation bound client
  // using configureOperation with forceValidation=true
  const greedyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: true },
  );
  const petsResponse1 = await greedyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse1.isValid === true && petsResponse1.status === 200) {
    // bound automatic validation: .parsed available
    petsResponse1.parsed;
  }

  // Manual validation bound client
  // overridden per op configuration forceValidation=false
  const lazyPetResponse = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    { ...globalConfig, forceValidation: false },
  );
  if (lazyPetResponse.isValid === true && lazyPetResponse.status === 200) {
    lazyPetResponse.parse();
  }

  // Manual validation bound client
  // with configureOperation and forceValidation=false
  const lazyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: false },
  );
  const petsResponse2 = await lazyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse2.isValid === true && petsResponse2.status === 200) {
    petsResponse2.parse();
  }
}

demonstrateClient();
