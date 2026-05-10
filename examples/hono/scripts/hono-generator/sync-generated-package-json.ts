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
  "zod",
] as const;
const honoMockDependencyNames = ["zocker"] as const;
const managedDependencyNames = [
  ...honoRuntimeDependencyNames,
  ...honoMockDependencyNames,
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

function getDependencyVersion(
  packageJson: PackageJson,
  filePath: string,
  dependencyName: string,
) {
  const dependencyVersion =
    packageJson.dependencies?.[dependencyName] ??
    packageJson.devDependencies?.[dependencyName];

  if (dependencyVersion === undefined) {
    throw new Error(
      `Expected ${filePath} to define ${dependencyName} as a dependency or devDependency.`,
    );
  }

  return dependencyVersion;
}

function getManagedDependencies(
  packageJson: PackageJson,
  filePath: string,
  includeMocks: boolean,
) {
  const dependencyNames = includeMocks
    ? [...honoRuntimeDependencyNames, ...honoMockDependencyNames]
    : honoRuntimeDependencyNames;

  return Object.fromEntries(
    dependencyNames.map((dependencyName) => {
      return [
        dependencyName,
        getDependencyVersion(packageJson, filePath, dependencyName),
      ];
    }),
  );
}

function stripManagedDependencies(dependencies?: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(dependencies ?? {}).filter(([dependencyName]) => {
      return !managedDependencyNames.includes(
        dependencyName as (typeof managedDependencyNames)[number],
      );
    }),
  );
}

function sortDependencies(dependencies: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(dependencies).sort(([leftName], [rightName]) => {
      return leftName.localeCompare(rightName);
    }),
  );
}

interface SyncGeneratedPackageJsonOptions {
  generatedDirPath: string;
  includeMocks: boolean;
  projectRoot: string;
}

export async function syncGeneratedPackageJson(
  options: SyncGeneratedPackageJsonOptions,
) {
  const { generatedDirPath, includeMocks, projectRoot } = options;
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
  const managedDependencies = getManagedDependencies(
    examplePackageJson,
    examplePackageJsonPath,
    includeMocks,
  );

  const nextPackageJson: PackageJson = {
    ...generatedPackageJson,
    dependencies: sortDependencies({
      ...stripManagedDependencies(generatedPackageJson.dependencies),
      ...managedDependencies,
    }),
  };

  await writeFileIfChanged(
    generatedPackageJsonPath,
    `${JSON.stringify(nextPackageJson, null, 2)}\n`,
  );
}
