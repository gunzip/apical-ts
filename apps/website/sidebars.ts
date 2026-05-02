import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Manually define the sidebar structure to match the README organization
  docsSidebar: [
    "introduction",
    "cli-usage",
    "generated-architecture",
    {
      collapsible: false,
      collapsed: false,
      type: "category",
      label: "Using the Generated Schemas",
      link: {
        type: "doc",
        id: "schema-generation/using-generated-zod-schemas",
      },
      items: [
        "schema-generation/schema-validation-modes",
        "schema-generation/string-format-overrides",
        "schema-generation/framework-integrations",
        "schema-generation/readonly-writeonly-properties",
      ],
    },
    {
      collapsible: false,
      collapsed: false,
      type: "category",
      label: "Using the Generated Client",
      link: {
        type: "doc",
        id: "client-generation/define-configuration",
      },
      items: [
        "client-generation/call-operations",
        "client-generation/response-handling",
        "client-generation/error-handling",
        "client-generation/response-payload-validation",
        "client-generation/custom-response-deserialization",
        "client-generation/handling-multiple-content-types",
      ],
    },
    "server-routes-wrappers-generation",
    "supported-input-formats",
    "supported-features",
    "benefits-of-operation-based-architecture",
    "comparison-with-alternative-libraries",
    "conclusion",
  ],
};

export default sidebars;
