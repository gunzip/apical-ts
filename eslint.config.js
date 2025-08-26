import lintRules from "@pagopa/eslint-config";

export default [
  {
    ignores: ["tests/**/*"],
  },
  ...lintRules,
];
