import lintRules from "@pagopa/eslint-config";

export default [
  {
    ignores: ["tests/**/*", "dist/**/*"],
  },
  ...lintRules,
];
