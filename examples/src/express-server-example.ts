/* Minimal Express server example using generated OpenAPI server wrappers */

import express from "express";
import {
  findPetsByStatusWrapper,
  type findPetsByStatusHandler,
  route as findPetsByStatusRoute,
} from "../generated/server/findPetsByStatus.js";
import {
  getPetByIdWrapper,
  type getPetByIdHandler,
  route as getPetByIdRoute,
} from "../generated/server/getPetById.js";
import {
  getInventoryWrapper,
  type getInventoryHandler,
  route as getInventoryRoute,
} from "../generated/server/getInventory.js";
import {
  extractRequestParams,
  sendWrapperResponse,
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

/* Implementation of findPetsByStatus handler */
const findPetsByStatusHandler: findPetsByStatusHandler = async (params) => {
  if (params.type !== "ok") {
    /* Handle validation errors */
    console.error("Validation error in findPetsByStatus:", params);
    return {
      status: 400,
      contentType: "",
      data: void 0,
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

/* Implementation of getPetById handler */
const getPetByIdHandler: getPetByIdHandler = async (params) => {
  if (params.type !== "ok") {
    /* Handle validation errors */
    console.error("Validation error in getPetById:", params);
    return {
      status: 400,
      contentType: "",
      data: void 0,
    };
  }

  const { petId } = params.value.path;
  console.log(`Getting pet by ID: ${petId}`);

  /* Find pet by ID */
  const pet = mockPets.find((p) => p.id === petId);

  if (!pet) {
    return {
      status: 404,
      contentType: "",
      data: void 0,
    };
  }

  return {
    status: 200,
    contentType: "application/json",
    data: pet,
  };
};

/* Implementation of getInventory handler */
const getInventoryHandler: getInventoryHandler = async (params) => {
  if (params.type !== "ok") {
    /* Handle validation errors */
    console.error("Validation error in getInventory:", params);
    return {
      status: 400,
      contentType: "",
      data: void 0,
    };
  }

  console.log("Getting inventory");

  return {
    status: 200,
    contentType: "application/json",
    data: mockInventory,
  };
};

/* Setup routes using generated wrappers */

/* Method 1: Manual setup with extractRequestParams and sendWrapperResponse */
app.get("/pet/findByStatus", async (req, res) => {
  const params = extractRequestParams(req);
  const wrappedHandler = findPetsByStatusWrapper(findPetsByStatusHandler);
  const result = await wrappedHandler(params);
  sendWrapperResponse(res, result);
});

/* Method 2: More concise setup using the route info */
const setupRoute = (
  wrapper: any,
  routeInfo: { path: string; method: string },
  handler: any,
) => {
  const expressPath = routeInfo.path.replace(
    /{([^}]+)}/g,
    ":$1",
  ); /* Convert {petId} to :petId */
  const method = routeInfo.method.toLowerCase() as keyof typeof app;

  if (typeof app[method] === "function") {
    (app[method] as any)(
      expressPath,
      async (req: express.Request, res: express.Response) => {
        try {
          const params = extractRequestParams(req);
          const wrappedHandler = wrapper(handler);
          const result = await wrappedHandler(params);
          sendWrapperResponse(res, result);
        } catch (error) {
          console.error("Error in route handler:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      },
    );
  }
};

/* Setup routes using the helper function */
setupRoute(getPetByIdWrapper, getPetByIdRoute(), getPetByIdHandler);
setupRoute(getInventoryWrapper, getInventoryRoute(), getInventoryHandler);

/* Health check endpoint */
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
