import { promises as fs } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseFormatOverrideArguments } from "../../src/format-overrides.js";
import { generate } from "../../src/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const craftRoot = resolve(__dirname, "../..");
const inputSpec = join(__dirname, "fixtures/format-overrides.yaml");
const outputDir = join(__dirname, "../../tmp/format-overrides");
const taxCodeSourcePath = join(
  __dirname,
  "fixtures/format-overrides/TaxCode.ts",
);
const formatOverrideAlias = "__apicalStringFormatTaxCode";

describe("format overrides integration", () => {
  beforeEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  it("imports the custom schema into generated schemas and parameter files", async () => {
    await generateWithFormatOverride();

    const profilePath = join(outputDir, "schemas/Profile.ts");
    const parametersPath = join(
      outputDir,
      "schemas/getProfileByTaxCodeParameters.ts",
    );
    const profileContent = await fs.readFile(profilePath, "utf-8");
    const parametersContent = await fs.readFile(parametersPath, "utf-8");
    const expectedImport = `import { TaxCode as ${formatOverrideAlias} } from ${JSON.stringify(
      getExpectedImportSpecifier(profilePath),
    )};`;

    expect(profileContent).toContain(expectedImport);
    expect(profileContent).toContain(`"fiscalCode": ${formatOverrideAlias}`);
    expect(parametersContent).toContain(expectedImport);
    expect(parametersContent).toContain(`"taxCode": ${formatOverrideAlias}`);
  });

  it("propagates the overridden type through client, routes, and server", async () => {
    await generateWithFormatOverride();
    await fs.writeFile(join(outputDir, "consumer.ts"), createConsumerSource());

    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "tsgo",
        "-p",
        join(outputDir, "tsconfig.json"),
        "--pretty",
        "false",
      ],
      {
        cwd: craftRoot,
        encoding: "utf-8",
      },
    );

    if (result.status !== 0) {
      console.error(result.stdout);
      console.error(result.stderr);
    }

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/error TS\d{4}:/);
  });
});

function createConsumerSource(): string {
  return `import * as z from "zod";
import { createProfile } from "./client/createProfile.ts";
import { createProfileRequestMap } from "./routes/createProfile.ts";
import { serverRoute as getProfileByTaxCodeServerRoute } from "./routes/getProfileByTaxCode.ts";
import type { Profile } from "./schemas/Profile.ts";
import type { getProfileByTaxCodeHandler } from "./server/getProfileByTaxCode.ts";

const validProfile: Profile = { fiscalCode: "TAX-001" };
// @ts-expect-error invalid tax code should be rejected by the overridden schema type
const invalidProfile: Profile = { fiscalCode: "INVALID" };

type CreateProfileRequest = z.infer<typeof createProfileRequestMap["application/json"]>;
const validRequest: CreateProfileRequest = validProfile;
// @ts-expect-error invalid tax code should be rejected in route request maps
const invalidRequest: CreateProfileRequest = { fiscalCode: "INVALID" };

const config = {
  baseURL: "http://example.com",
  fetch: async () =>
    new Response(JSON.stringify({ fiscalCode: "TAX-001" }), {
      headers: { "content-type": "application/json" },
      status: 201,
    }),
  forceValidation: false,
  headers: {},
};

void createProfile({ body: validProfile }, config);
// @ts-expect-error invalid tax code should be rejected by generated client params
void createProfile({ body: { fiscalCode: "INVALID" } }, config);

type ServerParsedParams = Extract<
  Parameters<getProfileByTaxCodeHandler>[0],
  { isValid: true }
>["value"];

const validPath: ServerParsedParams["path"] = { taxCode: "TAX-001" };
// @ts-expect-error invalid tax code should be rejected by generated server params
const invalidPath: ServerParsedParams["path"] = { taxCode: "INVALID" };

type RoutePath = z.infer<typeof getProfileByTaxCodeServerRoute.params.shape.path>;
const validRoutePath: RoutePath = validPath;
// @ts-expect-error invalid tax code should be rejected by generated route params
const invalidRoutePath: RoutePath = { taxCode: "INVALID" };

void validRequest;
void validRoutePath;
void invalidPath;
void invalidProfile;
void invalidRequest;
void invalidRoutePath;
`;
}

async function generateWithFormatOverride(): Promise<void> {
  await generate({
    formatOverrides: parseFormatOverrideArguments(
      ["tax-code=./tests/integrations/fixtures/format-overrides/TaxCode.ts"],
      craftRoot,
    ),
    generateClient: true,
    generateRoutes: true,
    generateServer: true,
    input: inputSpec,
    output: outputDir,
  });
}

function getExpectedImportSpecifier(filePath: string): string {
  const relativePath = relative(
    dirname(filePath),
    taxCodeSourcePath,
  ).replaceAll("\\", "/");

  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}
