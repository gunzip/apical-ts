import path from "node:path";

import { readTextFile, writeFileIfChanged } from "./file-system.js";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  type?: string;
  version?: string;
}

const honoRuntimeDependencyNames = [
  "@hono/zod-validator",
  "hono",
  "zocker",
  "zod",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePackageJson(
  packageJsonContent: string | undefined,
  filePath: string,
): PackageJson {
  if (packageJsonContent === undefined) {
    throw new Error(`Expected package.json at ${filePath}.`);
  }

  const parsedValue: unknown = JSON.parse(packageJsonContent);
  if (!isRecord(parsedValue)) {
    throw new Error(`Expected ${filePath} to contain a JSON object.`);
  }

  return parsedValue;
}

function getDependencies(
  packageJson: PackageJson,
  filePath: string,
): Record<string, string> {
  if (packageJson.dependencies === undefined) {
    throw new Error(`Expected ${filePath} to define dependencies.`);
  }

  return packageJson.dependencies;
}

function getHonoRuntimeDependencies(
  packageJson: PackageJson,
  filePath: string,
): Record<(typeof honoRuntimeDependencyNames)[number], string> {
  const dependencies = getDependencies(packageJson, filePath);

  return Object.fromEntries(
    honoRuntimeDependencyNames.map((dependencyName) => {
      const dependencyVersion = dependencies[dependencyName];

      if (dependencyVersion === undefined) {
        throw new Error(
          `Expected ${filePath} to define ${dependencyName} as a runtime dependency.`,
        );
      }

      return [dependencyName, dependencyVersion];
    }),
  ) as Record<(typeof honoRuntimeDependencyNames)[number], string>;
}

function sortDependencies(dependencies: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(dependencies).sort(([leftName], [rightName]) => {
      return leftName.localeCompare(rightName);
    }),
  );
}

export async function syncGeneratedPackageJson(
  projectRoot: string,
  generatedDirPath: string,
) {
  const generatedPackageJsonPath = path.join(generatedDirPath, "package.json");
  const examplePackageJsonPath = path.join(projectRoot, "package.json");

  const [generatedPackageJsonContent, examplePackageJsonContent] =
    await Promise.all([
      readTextFile(generatedPackageJsonPath),
      readTextFile(examplePackageJsonPath),
    ]);

  const generatedPackageJson = parsePackageJson(
    generatedPackageJsonContent,
    generatedPackageJsonPath,
  );
  const examplePackageJson = parsePackageJson(
    examplePackageJsonContent,
    examplePackageJsonPath,
  );
  const honoRuntimeDependencies = getHonoRuntimeDependencies(
    examplePackageJson,
    examplePackageJsonPath,
  );

  const nextPackageJson: PackageJson = {
    ...generatedPackageJson,
    dependencies: sortDependencies({
      ...generatedPackageJson.dependencies,
      ...honoRuntimeDependencies,
    }),
  };

  await writeFileIfChanged(
    generatedPackageJsonPath,
    `${JSON.stringify(nextPackageJson, null, 2)}\n`,
  );
}
