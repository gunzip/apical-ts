---
applyTo: "**/*.ts"
---

## Code Style Guidelines

- Never add jsdoc comments: TypeScript typing is sufficient.
- Use C block syntax (`/* ... */`) for method-level comments.
- Use C++ style comments (`// ...`) for inline documentation.
- Avoid to pass too many arguments to functions, prefer using typed
  configuration objects.
- Nullable or boolean arguments are code smells; prefer configuration objects as
  arguments.
- Avoid casts and check if a cast is really necessary; do not use unnecessary
  casts. IMPORTANT: Especially avoid `as any`.
- Always remove legacy and unreachable code.
- Avoid creating overly complex or large methods/modules; split into smaller,
  single focused, manageable functions with clear naming.
- Comment unclear code sections with C block comments explaining the reason for
  the code and, when applicable, the input and output produced.
- Never commit code without running format and linting, ensuring all checks pass
  using pnpm lint and pnpm format.
- Run pnpm lint to fix import and method ordering instead of manually sorting.
- Do not create barrel files that re-export everything from a module; import
  directly from the module instead.
