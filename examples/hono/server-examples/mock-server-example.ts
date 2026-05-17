import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { pathToFileURL } from "node:url";

import {
  registerGeneratedRoutes,
  registeredRoutes,
} from "../generated/hono/register-routes.ts";

const PORT = 3002;

export const app = new Hono();

registerGeneratedRoutes(app);

app.get("/health", (context) => {
  return context.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

if (process.argv[1] !== undefined) {
  const currentModuleUrl = pathToFileURL(process.argv[1]).href;

  if (import.meta.url === currentModuleUrl) {
    serve(
      {
        fetch: app.fetch,
        port: PORT,
      },
      (info) => {
        console.log(
          `🚀 Hono mock server running on http://localhost:${info.port}`,
        );
        console.log(
          "📊 Mock handlers are generated as one file per operation for the demo flow",
        );
        console.log("🔍 Validation errors include detailed error messages");
        console.log("📚 Registered routes:");

        registeredRoutes.forEach((route) => {
          console.log(
            `  ${route.method.toUpperCase()} http://localhost:${info.port}${route.path} (${route.operationId})`,
          );
        });

        console.log(`  GET http://localhost:${info.port}/health`);
      },
    );
  }
}
