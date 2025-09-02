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
    "supported-input-formats",
    "programmatic-usage",
    // 'generated-architecture', // TODO: Fix MDX issues
    {
      type: "category",
      label: "Client Generation",
      items: [
        "client-generation/define-configuration",
        "client-generation/call-operations",
        "client-generation/binding-configuration-to-operations",
        // TODO: Add remaining client generation pages
        // 'client-generation/response-handling',
        // 'client-generation/error-handling',
        // 'client-generation/response-payload-validation',
        // 'client-generation/custom-response-deserialization',
        // 'client-generation/handling-multiple-content-types',
        // 'client-generation/using-generated-zod-schemas',
      ],
    },
    // TODO: Add remaining main pages
    // 'server-routes-wrappers-generation',
    // 'supported-features',
    // 'benefits-of-operation-based-architecture',
    // 'comparison-with-alternative-libraries',
    // 'conclusion',
  ],
};

export default sidebars;
