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

const clientPreview = `import { findPetsByStatus } from "./generated/operations/findPetsByStatus.js";

// Import just the operations you need
// without pulling in a huge client bundle.
const r = await findPetsByStatus({
  query: { status: "available" },
});

// Strict typing over status code and content type
// using discriminated unions guides agents toward safe code
if (r.status === "200") {
  // Zod v4 parsed payload
  console.log(r.parsed.data[0].name);
}
`;

const integrationPills = [
  {
    name: "Hono",
    label: "custom handlers",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/hono",
  },
  {
    name: "MSW",
    label: "mock routes",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/msw-mock-server",
  },
  {
    name: "React Query",
    label: "client hooks",
    href: "https://github.com/gunzip/apical-ts/tree/main/examples/react-query-hooks",
  },
] as const;

const featureCards = [
  {
    index: "AI adapters",
    title: "Precise building blocks for custom integrations",
    description:
      "Precise per-operation schemas and route shapes give agents enough structure to generate custom Hono, MSW, or React Query adapters fast.",
  },
  {
    index: "No rigid plugins",
    title: "Integrations are vibe-coded starters, not framework lock-in",
    description:
      "No opinionated plugins. Just exact types and small examples you can inspect, extend, and regenerate with AI.",
  },
  {
    index: "Tree shaking",
    title: "Selective imports stay practical on very large specs",
    description:
      "Import only the operations you actually call, even when the OpenAPI document defines thousands of endpoints.",
  },
  {
    index: "Typed responses",
    title: "Discriminated unions guide coding agents toward safe code",
    description:
      "Responses narrow by status code and content type, so agent-written code can branch safely with strong typing.",
  },
] as const;

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.heroBanner}>
      <div className={clsx("container", styles.heroLayout)}>
        <div className={styles.heroBody}>
          <div className={styles.eyebrow}>{siteConfig.title}</div>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.tagline}
          </Heading>
          <p className={styles.heroSummary}>
            Apical gives coding agents a precise base: exact Zod v4 schemas for
            each operation and typed route structures extracted from your
            OpenAPI contract.
          </p>
          <div className={styles.integrationStrip}>
            <ul className={styles.integrationList}>
              {integrationPills.map((integration) => (
                <li key={integration.name}>
                  {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
                  <Link
                    className={styles.integrationItem}
                    href={integration.href}
                  >
                    <span className={styles.integrationName}>
                      {integration.name}
                    </span>
                    <span className={styles.integrationDivider}>/</span>
                    <span className={styles.integrationLabel}>
                      {integration.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.heroDetail}>
            With that base, it is easy to vibe-code custom adapters such as Hono
            handlers, MSW mocks, or React Query hooks without baking framework
            plugins into the generator itself. The sweet spot between{" "}
            <strong>flexibility and precision</strong> for AI-assisted
            development.
          </p>
          <div className={styles.heroActions}>
            {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
            <Link
              className={clsx(
                "button button--lg button--primary",
                styles.primaryAction,
              )}
              to="/docs/introduction"
            >
              Read the docs
            </Link>
            {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
            <Link
              className={styles.secondaryAction}
              href="https://github.com/gunzip/apical-ts"
            >
              View on GitHub
            </Link>
          </div>
        </div>
        <div className={styles.heroPreview}>
          <div className={styles.previewFrame}>
            <div className={styles.previewHeader}>
              <span className={styles.previewPill}>
                generate schemas and routes
              </span>
            </div>
            <CodeBlock
              className={styles.previewCode}
              code={previewCommand}
              language="bash"
            />
          </div>

          <div className={styles.outputCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewPill}>use generated client</span>
            </div>
            <CodeBlock
              className={styles.previewCode}
              code={clientPreview}
              language="typescript"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>What matters in practice</p>
          <Heading as="h2" className={styles.sectionTitle}>
            A hard base for coding agents.
          </Heading>
          <p className={styles.sectionLead}>
            Apical keeps that hard part small and precise: schemas and route
            metadata first, custom adapters on top.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {featureCards.map((card) => (
            <article key={card.title} className={styles.featureCard}>
              <span className={styles.featureIndex}>{card.index}</span>
              <Heading as="h3" className={styles.featureTitle}>
                {card.title}
              </Heading>
              <p className={styles.featureDescription}>{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="OpenAPI to a typed TypeScript stack"
      description="Generate Zod v4 schemas, typed clients, and server wrappers from one OpenAPI specification."
    >
      <div className={styles.pageShell}>
        <HomepageHeader />
        <main className={styles.mainContent}>
          <FeatureSection />
        </main>
      </div>
    </Layout>
  );
}
