# Publishing to NPM registry

This document describes how to publish the `yanogen-ts` package to NPM registry.

## Setup

The project is configured to publish to NPM registry with the following setup:

- **Package name**: `yanogen-ts`

## Publishing Methods

### 1. Automatic Publishing via GitHub Releases

The recommended way to publish is by creating a GitHub release:

1. **Create a new release** on GitHub:
   - Go to the repository on GitHub
   - Click "Releases" → "Create a new release"
   - Create a new tag (e.g., `v1.0.0`, `v1.0.1`)
   - Add release notes
   - Click "Publish release"

2. **Automatic workflow** will:
   - Run all tests and checks
   - Build the project
   - Publish to NPM registry

### 2. Manual Publishing via Workflow Dispatch

You can also trigger publishing manually:

1. Go to **Actions** tab in GitHub
2. Select **"Publish to NPM registry"** workflow
3. Click **"Run workflow"**
4. Optionally specify a version number
5. Click **"Run workflow"**

### 3. Local Publishing (Not Recommended)

For development/testing purposes only:

```bash
# Build and publish
pnpm run build
pnpm publish --no-git-checks
```

## Version Management

Use the provided scripts for version bumping:

```bash
# Patch version (1.0.0 → 1.0.1)
pnpm run release:patch

# Minor version (1.0.0 → 1.1.0)
pnpm run release:minor

# Major version (1.0.0 → 2.0.0)
pnpm run release:major
```

These scripts will:

1. Update the version in `package.json`
2. Create a git commit
3. Create a git tag
4. Push the changes and tag to GitHub

After pushing the tag, you can create a GitHub release to trigger automatic
publishing.

## Authentication

### For GitHub Actions (Automatic)

The workflow uses the repository secret `NPM_TOKEN` which has the necessary
permissions to publish packages.

## Installation for Users

```bash
pnpm add yanogen-ts
```

## Package Contents

The published package includes:

- `dist/` - Compiled JavaScript files
- `README.md` - Documentation
- `LICENSE` - License file
- `package.json` - Package metadata

## Troubleshooting

### Common Issues

1. **Package Already Exists**: You cannot republish the same version. Bump the
   version first
2. **Build Failures**: The workflow will fail if tests, linting, or type
   checking fails
