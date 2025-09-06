import { globalConfig } from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";

// Custom fetch function that includes credentials by default
const fetchWithCredentials = (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  return fetch(input, {
    ...init,
    credentials: "include", // Include credentials (cookies, authorization headers, etc.)
  });
};

async function demonstrateCustomFetch() {
  // Use the custom fetch with credentials in the client configuration
  const response = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    {
      ...globalConfig,
      fetch: fetchWithCredentials, // Override the default fetch with our custom one
    },
  );

  if (response.isValid && response.status === 200) {
    console.log("Successfully fetched pets with credentials included");
    console.log(`Found ${response.parsed.data.length} pets`);
  } else if (!response.isValid) {
    console.error("Error fetching pets:", response.error);
  } else {
    console.error("Unexpected response status:", response.status);
  }
}

demonstrateCustomFetch();
