import lintRules from "@pagopa/eslint-config";

export default [
  ...lintRules,
  {
    rules: {
      // Override this rules to show an error when using interfaces, enforcing the use of types
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
