import * as fs from "node:fs";
import path from "path";
import pLimit from "p-limit";

/**
 * Assume that the generated client and routes are available.
 */
import * as importedClient from "../generated/client/index.js";
import * as importedRoutes from "../generated/routes/index.js";

const root = process.cwd();
const apiDir = path.join(root, "generated");
const hooksDir = path.join(apiDir, "react-query-hooks");
const indexFile = path.join(apiDir, "react-query-hooks", "index.ts");

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function main() {
  const clientExports = (
    Object.keys(importedClient) as (keyof typeof importedClient)[]
  ).filter((k) => typeof importedClient[k] === "function");
  const routesObj = importedRoutes.routes;

  const ops = clientExports.map((fnName) => {
    const route = routesObj[fnName as keyof typeof routesObj];
    const method =
      route && route.method ? String(route.method).toUpperCase() : undefined;
    const opName = fnName;
    return { name: opName, method };
  });

  // Ensure hooks directory exists
  await fs.promises.mkdir(hooksDir, { recursive: true });

  const indexExports: string[] = [];

  const concurrency = Number(process.env.HOOKS_CONCURRENCY) || 4;
  const limit = pLimit(concurrency);

  const tasks = ops.map((op) =>
    limit(async () => {
      const fnName = op.name;
      const method = op.method;
      const hookQueryName = `use${capitalize(fnName)}`;
      const hookMutationName = `use${capitalize(fnName)}Mutation`;

      const fileName = `${fnName}.ts`;
      const filePath = path.join(hooksDir, fileName);

      const imports: string[] = [];
      imports.push(
        "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';",
      );
      imports.push("import * as ops from '../client/index.js';");

      const body: string[] = [];
      body.push(`// Hook for operation ${fnName}`);

      if (method === "GET" || method === "HEAD") {
        body.push(
          `export function ${hookQueryName}(args: Parameters<typeof ops.${fnName}>[0]) {`,
        );
        body.push(`  type Result = Awaited<ReturnType<typeof ops.${fnName}>>;`);
        body.push(`  type Error = unknown;`);
        body.push(`  return useQuery<Result, Error>({`);
        body.push(`    queryKey: ["${fnName}", args],`);
        body.push(`    queryFn: () => ops.${fnName}(args),`);
        body.push(`  });`);
        body.push(`}`);
      } else {
        body.push(`export function ${hookMutationName}() {`);
        body.push(`  type Result = Awaited<ReturnType<typeof ops.${fnName}>>;`);
        body.push(`  type Variables = Parameters<typeof ops.${fnName}>[0];`);
        body.push(`  const qc = useQueryClient();`);
        body.push(`  return useMutation<Result, unknown, Variables>({`);
        body.push(
          `    mutationFn: (variables: Variables) => ops.${fnName}(variables),`,
        );
        body.push(`    onSuccess: () => qc.invalidateQueries(),`);
        body.push(`  });`);
        body.push(`}`);
      }

      const content = `${imports.join("\n")}

${body.join("\n\n")}
`;

      await fs.promises.writeFile(filePath, content, "utf8");
      console.log("Wrote", filePath);

      // Export compiled JS files for ESM compatibility in the published output
      indexExports.push(
        `export * from './${fileName.replace(/\.ts$/, "")}.js';`,
      );
    }),
  );

  await Promise.all(tasks);

  // Write index.ts that re-exports all hooks
  const indexContent = `${indexExports.join("\n")}\n`;
  await fs.promises.writeFile(indexFile, indexContent, "utf8");
  console.log("Wrote", indexFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
