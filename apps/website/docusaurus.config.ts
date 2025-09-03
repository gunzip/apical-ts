import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "@apical-ts/craft",
  tagline: "Strictly-typed client and server from OpenAPI to Typescript",
  favicon: "img/favicon.ico",

  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/svg+xml",
        href: "/img/favicon.svg",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/img/favicon-32x32.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/img/favicon-16x16.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/img/apple-touch-icon.png",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content:
          "Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications. Supports OpenAPI 2.0, 3.0.x, and 3.1.x with comprehensive validation and error handling.",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "keywords",
        content:
          "OpenAPI, TypeScript, Zod, API client generator, type safety, schema validation, REST API, code generation, OpenAPI 3.1, TypeScript generator",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:title",
        content: "@apical-ts/craft - OpenAPI to TypeScript Generator",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:description",
        content:
          "Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications. Supports comprehensive validation and error handling.",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:type",
        content: "website",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:url",
        content: "https://gunzip.github.io/apical-ts/",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:image",
        content: "https://gunzip.github.io/apical-ts/img/demo.gif",
      },
    },
    {
      tagName: "meta",
      attributes: {
        property: "og:image:alt",
        content:
          "@apical-ts/craft demo showing OpenAPI to TypeScript generation",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "twitter:card",
        content: "summary_large_image",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "twitter:title",
        content: "@apical-ts/craft - OpenAPI to TypeScript Generator",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "twitter:description",
        content:
          "Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications.",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "twitter:image",
        content: "https://gunzip.github.io/apical-ts/img/demo.gif",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "author",
        content: "@apical-ts/craft Contributors",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "robots",
        content: "index, follow",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "canonical",
        href: "https://gunzip.github.io/apical-ts/",
      },
    },
    {
      tagName: "script",
      attributes: {
        type: "application/ld+json",
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "@apical-ts/craft",
        description:
          "Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications. Supports OpenAPI 2.0, 3.0.x, and 3.1.x with comprehensive validation and error handling.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Node.js",
        programmingLanguage: "TypeScript",
        url: "https://gunzip.github.io/apical-ts/",
        downloadUrl: "https://www.npmjs.com/package/@apical-ts/craft",
        codeRepository: "https://github.com/gunzip/apical-ts",
        license: "https://github.com/gunzip/apical-ts/blob/main/LICENSE",
        author: {
          "@type": "Organization",
          name: "@apical-ts/craft Contributors",
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        keywords: [
          "OpenAPI",
          "TypeScript",
          "Zod",
          "API client generator",
          "type safety",
          "schema validation",
        ],
        softwareVersion: "latest",
        releaseNotes: "See GitHub releases for changelog",
      }),
    },
  ],

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://gunzip.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/apical-ts/",

  // GitHub pages deployment config.
  organizationName: "gunzip", // Usually your GitHub org/user name.
  projectName: "apical-ts", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/gunzip/apical-ts/tree/main/apps/website/",
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
        gtag: false, // Can be enabled later if needed
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {
        name: "google-site-verification",
        content: "placeholder_for_google_site_verification", // Replace with actual verification code when available
      },
    ],
    colorMode: {
      defaultMode: "dark",
    },
    // Replace with your project's social card
    image: "img/demo.gif",
    navbar: {
      title: "@apical-ts/craft",
      logo: {
        alt: "@apical-ts/craft Logo",
        src: "img/logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/gunzip/apical-ts",
          label: "GitHub",
          position: "right",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Getting Started",
              to: "/docs/introduction",
            },
            {
              label: "CLI Usage",
              to: "/docs/cli-usage",
            },
            {
              label: "Client Generation",
              to: "/docs/client-generation/define-configuration",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub Issues",
              href: "https://github.com/gunzip/apical-ts/issues",
            },
            {
              label: "GitHub Discussions",
              href: "https://github.com/gunzip/apical-ts/discussions",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/gunzip/apical-ts",
            },
            {
              label: "npm Package",
              href: "https://www.npmjs.com/package/@apical-ts/craft",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} @apical-ts/craft. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
