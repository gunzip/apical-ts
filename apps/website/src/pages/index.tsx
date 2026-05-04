import { type ComponentProps } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import CodeBlock from "../components/CodeBlock";
import styles from "./index.module.css";

const previewCommand = `npx @apical-ts/craft generate \\
  -i https://petstore.swagger.io/v2/swagger.json \\
  -o ./generated \\
  --client --server`;

const outputOrder = ["schema", "route", "client", "server"] as const;
type OutputExampleId = (typeof outputOrder)[number];

const outputExamples = {
  schema: {
    title: "Schema",
    path: "schemas/",
    note: "Validate payloads and infer exact runtime-safe types.",
    language: "typescript",
    code: `import { UserSchema } from "./generated/schemas/User.js";

const result = UserSchema.safeParse(apiResponse);

if (result.success) {
  console.log(result.data.email);
}`,
  },
  route: {
    title: "Route",
    path: "routes/",
    note: "Read generated method/path metadata for adapters and tooling.",
    language: "typescript",
    code: `import { getPetByIdRoute } from "./generated/routes/getPetById.js";

const route = getPetByIdRoute();

console.log({
  method: route.method,
  path: route.path,
  responseMap: route.responseMap,
  requestMap: route.requestMap,
});`,
  },
  client: {
    title: "Client",
    path: "client/",
    note: "Call one operation and branch on typed responses.",
    language: "typescript",
    code: `import { findPetsByStatus } from "./generated/client/findPetsByStatus.js";

// Import just the operations you need
// without pulling in a huge client bundle.
const response = await findPetsByStatus({
  query: { status: "available" },
});

// Strict typing over status code and content type
// using discriminated unions guides agents toward safe code
if (response.status === "200") {
  // Zod v4 parsed payload
  console.log(response.parsed.data[0].name);
}`,
  },
  server: {
    title: "Server",
    path: "server/",
    note: "Write typed handlers and keep validation inside the wrapper.",
    language: "typescript",
    code: `import type { getPetByIdHandler } from "./generated/server/getPetById.js";

const handler: getPetByIdHandler = async (params) => {
  if (!params.isValid) return { status: "400" };

  const petId = params.value.path.petId;
  const pet = mockPets.find((candidate) => candidate.id === petId);
  if (!pet) return { status: "404" };

  return {
    status: "200",
    contentType: "application/json",
    data: pet,
  };
};`,
  },
} satisfies Record<
  OutputExampleId,
  {
    title: string;
    path: string;
    note: string;
    language: string;
    code: string;
  }
>;

const integrationCards = [
  {
    name: "Hono",
    label: "custom handlers",
    description:
      "Derive framework routes from generated metadata while keeping validation and contract logic centralized.",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/hono",
  },
  {
    name: "MSW",
    label: "mock routes",
    description:
      "Generate mock handlers from the same operations you use in production clients and test suites.",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/msw-mock-server",
  },
  {
    name: "React Query",
    label: "client hooks",
    description:
      "Wrap operation functions in hooks without giving up tree-shaking or precise response typing.",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/react-query-hooks",
  },
] as const;

function HomepageLink(props: ComponentProps<typeof Link>) {
  // @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types.
  return <Link {...props} />;
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.heroBanner}>
      <div className={clsx("container", styles.heroLayout)}>
        <div className={styles.heroBody}>
          <Heading as="h1" className={styles.heroTitle}>
            From OpenAPI to your TypeScript stack.
          </Heading>
          <p className={styles.heroSummary}>
            <strong>{siteConfig.title}</strong> generates Zod v4 schemas, route
            metadata, typed clients, and server wrappers from one OpenAPI
            document.
          </p>
          <div className={styles.heroActions}>
            <HomepageLink
              className={clsx(
                "button button--lg button--primary",
                styles.primaryAction,
              )}
              to="/docs/introduction"
            >
              Get started
            </HomepageLink>
            <HomepageLink
              className={styles.secondaryAction}
              href="https://github.com/gunzip/apical-ts"
            >
              View on GitHub
            </HomepageLink>
          </div>
          <p className={styles.heroDetail}>
            Compose Hono, MSW, React Query, and custom adapters without drifting
            away from the spec. The same precision gives coding agents safer
            primitives.
          </p>
        </div>

        <div className={styles.heroPreview}>
          <div className={styles.previewFrame}>
            <div className={styles.previewHeader}>
              <span className={styles.previewPill}>generate from one spec</span>
              <span className={styles.previewCaption}>CLI</span>
            </div>
            <CodeBlock
              className={styles.previewCode}
              code={previewCommand}
              language="bash"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function OutputExamplesSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <Heading as="h2" className={styles.sectionTitle}>
            Framework-agnostic routes.
          </Heading>
          <p className={styles.sectionLead}>
            Generate reusable schemas, route metadata, client operations, and
            server wrappers as small strong typed building blocks for your stack
            and agents.
          </p>
        </div>

        <div className={styles.exampleGrid}>
          {outputOrder.map((outputId, index) => {
            const output = outputExamples[outputId];

            return (
              <article key={outputId} className={styles.exampleCard}>
                <div className={styles.exampleHeader}>
                  <span className={styles.exampleIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.examplePath}>{output.path}</span>
                </div>
                <div className={styles.exampleCopy}>
                  <Heading as="h3" className={styles.exampleTitle}>
                    {output.title}
                  </Heading>
                  <p className={styles.exampleDescription}>{output.note}</p>
                </div>
                <CodeBlock
                  className={clsx(styles.previewCode, styles.exampleCode)}
                  code={output.code}
                  language={output.language}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function IntegrationSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>Real starting points</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Start from examples for the glue code around the contract.
          </Heading>
          <p className={styles.sectionLead}>
            The integrations are meant to be inspectable starters. Copy the
            pattern you need, adapt it to your stack, and keep the generated
            contract as the stable base.
          </p>
        </div>

        <div className={styles.integrationGrid}>
          {integrationCards.map((integration) => (
            <HomepageLink
              key={integration.name}
              className={styles.integrationCard}
              href={integration.href}
            >
              <div className={styles.integrationHeader}>
                <Heading as="h3" className={styles.integrationName}>
                  {integration.name}
                </Heading>
                <span className={styles.integrationLabel}>
                  {integration.label}
                </span>
              </div>
              <p className={styles.integrationDescription}>
                {integration.description}
              </p>
              <span className={styles.resourceMeta}>View example</span>
            </HomepageLink>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Generate exact Zod schemas and typed clients from OpenAPI"
      description="Turn one OpenAPI specification into exact Zod v4 schemas, route metadata, typed clients, and server wrappers for TypeScript."
    >
      <div className={styles.pageShell}>
        <HomepageHeader />
        <main className={styles.mainContent}>
          <OutputExamplesSection />
          <IntegrationSection />
        </main>
      </div>
    </Layout>
  );
}
