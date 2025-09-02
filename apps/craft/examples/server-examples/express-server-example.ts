/* Minimal Express server example using generated OpenAPI server wrappers */

import express from "express";
import {
  findPetsByStatusWrapper,
  type findPetsByStatusHandler,
} from "../generated/server/findPetsByStatus.js";
import {
  type getPetByIdHandler,
  route as getPetByIdRoute,
} from "../generated/server/getPetById.js";
import {
  type getInventoryHandler,
  route as getInventoryRoute,
} from "../generated/server/getInventory.js";
import {
  createExpressAdapter,
  extractRequestParams,
} from "./express-adapter.js";

const app = express();
const PORT = 3000;

/* Setup middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Mock data store */
const mockPets = [
  {
    id: 1,
    name: "Buddy",
    photoUrls: ["https://example.com/buddy.jpg"],
    status: "available" as const,
    category: { id: 1, name: "Dogs" },
    tags: [{ id: 1, name: "friendly" }],
  },
  {
    id: 2,
    name: "Whiskers",
    photoUrls: ["https://example.com/whiskers.jpg"],
    status: "pending" as const,
    category: { id: 2, name: "Cats" },
    tags: [{ id: 2, name: "indoor" }],
  },
  {
    id: 3,
    name: "Max",
    photoUrls: ["https://example.com/max.jpg"],
    status: "sold" as const,
    category: { id: 1, name: "Dogs" },
    tags: [{ id: 3, name: "trained" }],
  },
];

const mockInventory = {
  available: 5,
  pending: 2,
  sold: 3,
};

/* Implementation of getPetById handler */
const getPetByIdHandler: getPetByIdHandler = async (params) => {
  if (!params.success) {
    /* Handle validation errors */
    console.error("Validation error in getPetById:", params);
    return {
      status: 400,
    };
  }

  const { petId } = params.value.path;
  console.log(`Getting pet by ID: ${petId}`);

  /* Find pet by ID */
  const pet = mockPets.find((p) => p.id === petId);

  if (!pet) {
    return {
      status: 404,
    };
  }

  return {
    status: 200,
    contentType: "application/json",
    data: pet,
  };
};
/* Setup routes using the helper function */
createExpressAdapter(getPetByIdRoute(), getPetByIdHandler)(app);

/* Implementation of getInventory handler */
/* We disable type checking to allow emitting an unexpected response */
/* @ts-ignore */
const getInventoryHandler: getInventoryHandler = async (params) => {
  if (!params.success) {
    /* Handle validation errors */
    console.error("Validation error in getInventory:", params);
    return {
      status: 400,
    };
  }

  console.log("Getting inventory");

  return {
    status: 200,
    contentType: "application/json",
    data: mockInventory,
  };
};
createExpressAdapter(getInventoryRoute(), getInventoryHandler)(app);

/* Setup routes manually using generated wrappers */

const findPetsByStatusHandler: findPetsByStatusHandler = async (params) => {
  if (!params.success) {
    /* Handle validation errors */
    console.error("Validation error in findPetsByStatus:", params);
    return {
      status: 400,
    };
  }

  const { status } = params.value.query;
  console.log(`Finding pets by status: ${status}`);

  /* Filter pets by status */
  const filteredPets = mockPets.filter((pet) => pet.status === status);

  return {
    status: 200,
    contentType: "application/json",
    data: filteredPets,
  };
};

/* Manual setup with extractRequestParams and sendWrapperResponse */
app.get("/pet/findByStatus", async (req, res) => {
  // Get wrapped handler in order to validate request and response
  const result = await findPetsByStatusWrapper(findPetsByStatusHandler)(
    extractRequestParams(req),
  );
  switch (result.status) {
    case 200:
      res.status(result.status).type(result.contentType).send(result.data);
      break;
    case 400:
      res.status(result.status);
      break;
  }
});

/* Health check endpoint */

// RAW endpoints (no validation/wrapper) for benchmark comparison
app.get("/pet/raw/:petId", (req, res) => {
  const petId = parseInt(req.params.petId, 10);
  const pet = mockPets.find((p) => p.id === petId);
  if (!pet) {
    res.status(404).send();
    return;
  }
  res.status(200).json(pet);
});

app.get("/pet/raw/findByStatus", (req, res) => {
  const status = req.query.status;
  const filteredPets = mockPets.filter((pet) => pet.status === status);
  res.status(200).json(filteredPets);
});

app.get("/store/raw/inventory", (req, res) => {
  res.status(200).json(mockInventory);
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

/* Start the server */
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log("📊 Available endpoints:");
  console.log(`  GET /pet/findByStatus?status=available`);
  console.log(`  GET /pet/{petId} (e.g., /pet/1)`);
  console.log(`  GET /store/inventory`);
  console.log(`  GET /health`);
  console.log("");
  console.log("💡 Try these examples:");
  console.log(
    `  curl "http://localhost:${PORT}/pet/findByStatus?status=available"`,
  );
  console.log(`  curl "http://localhost:${PORT}/pet/1"`);
  console.log(`  curl "http://localhost:${PORT}/store/inventory"`);
});

export default app;
