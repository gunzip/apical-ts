# Publishing to GitHub Packages

This document describes how to publish the `@gunzip/typescript-openapi-generator` package to GitHub Packages.

## Setup

The project is configured to publish to GitHub Packages with the following setup:

- **Package name**: `@gunzip/typescript-openapi-generator`
- **Registry**: `https://npm.pkg.github.com`
- **Scope**: `@gunzip`

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
   - Publish to GitHub Packages

### 2. Manual Publishing via Workflow Dispatch

You can also trigger publishing manually:

1. Go to **Actions** tab in GitHub
2. Select **"Publish to GitHub Packages"** workflow
3. Click **"Run workflow"**
4. Optionally specify a version number
5. Click **"Run workflow"**

### 3. Local Publishing (Not Recommended)

For development/testing purposes only:

```bash
# Make sure you're authenticated to GitHub Packages
npm login --scope=@gunzip --registry=https://npm.pkg.github.com

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

After pushing the tag, you can create a GitHub release to trigger automatic publishing.

## Authentication

### For GitHub Actions (Automatic)

The workflow uses the built-in `GITHUB_TOKEN` which has the necessary permissions to publish packages.

### For Local Development

You need a GitHub Personal Access Token with `write:packages` permission:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Create a token with `write:packages` scope
3. Add it to your `.npmrc`:

```
@gunzip:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

## Installation for Users

Users need to configure their `.npmrc` to use GitHub Packages:

```
@gunzip:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=THEIR_GITHUB_TOKEN
```

Then install with:

```bash
pnpm add @gunzip/typescript-openapi-generator
```

## Package Contents

The published package includes:

- `dist/` - Compiled JavaScript files
- `README.md` - Documentation
- `LICENSE` - License file
- `package.json` - Package metadata

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Make sure your GitHub token has `write:packages` permission
2. **Package Already Exists**: You cannot republish the same version. Bump the version first
3. **Build Failures**: The workflow will fail if tests, linting, or type checking fails

### Checking Published Packages

You can view published packages at:
`https://github.com/gunzip/typescript-openapi-generator/packages`
