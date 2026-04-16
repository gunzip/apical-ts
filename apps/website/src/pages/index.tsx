import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import CodeBlock from "../components/CodeBlock";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className={clsx("container", styles.heroInner)}>
        {/* <div className={styles.heroBadge} aria-label="Project status badge">
          <span style={{ fontSize: "0.95rem" }}>🚀</span>
          <span>OpenAPI → TypeScript · Zod v4 Ready</span>
        </div> */}
        <Heading
          as="h1"
          className={clsx("hero__title", styles.heroTitleGradient)}
        >
          {siteConfig.title}
        </Heading>
        <div className={styles.heroSubBold}></div>
        <p className={clsx("hero__subtitle", styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <nav className={styles.buttons} aria-label="Main navigation">
          {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
          <Link
            className={clsx("button button--lg", styles.ctaButton)}
            style={{
              background: "linear-gradient(135deg, #2dd4bf, #22d3ee)",
              color: "#0e1a2b",
            }}
            to="/docs/introduction"
            aria-label="Get started with @apical-ts/craft documentation"
          >
            Get Started in 5&nbsp;min <span aria-hidden="true">→</span>
          </Link>
        </nav>
        {/* <div
          className={styles.installBar}
          role="group"
          aria-label="Install command"
        >
          <code>pnpm add -D @apical-ts/craft</code>
          <button
            type="button"
            onClick={() => {
              try {
                navigator.clipboard?.writeText("pnpm add -D @apical-ts/craft");
              } catch {}
            }}
            aria-label="Copy install command"
          >
            <span style={{ fontSize: "0.85rem" }}>📋</span> Copy
          </button>
        </div>*/}
        <section className={styles.demoSection} aria-label="Code examples">
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>CLI</div>
            <CodeBlock
              className={styles.codeBlock}
              code={`npx @apical-ts/craft generate \\\n -i https://petstore.swagger.io/v2/swagger.json \\\n -o ./generated \\\n --server \\\n --client\n\ncd generated\n\nnpm install && npm run build`}
              language="bash"
            />
          </div>
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>TypeScript</div>
            <CodeBlock
              className={styles.codeBlock}
              code={`import { findPetsByStatus } from './generated/client/findPetsByStatus.js';\n\nconst r = await findPetsByStatus({\n  query: { status: "available" },\n});\nif (r.status === "200") {\n  // Zod v4 parsed payload\n  console.log(r.parsed.data[0].name);\n}`}
              language="typescript"
            />
          </div>
        </section>
      </div>
    </header>
  );
}

function WhyChooseUs() {
  return (
    <section className={styles.whyChooseSection} aria-label="Key features">
      <div className="container">
        {/* <div className={styles.whyChooseTitle}>Why @apical-ts/craft?</div> */}
        <ul className={styles.whyChooseList}>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon} aria-hidden="true">
              🧩
            </span>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>
              Modular & Tree-shakable
            </h3>
            <p>
              Import only what you need. No bloat, minimal dependencies, no dead
              code.
            </p>
          </li>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon} aria-hidden="true">
              🔧
            </span>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>
              Framework Integrations
            </h3>
            <p>
              Easily adapt to any framework with generated Zod schemas. Includes
              ready-to-use integrations for{" "}
              {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
              <Link to="/docs/client-generation/framework-integrations#react-query-hooks">
                React Query
              </Link>
              ,{" "}
              {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
              <Link to="/docs/client-generation/framework-integrations#express-server-wrappers">
                Express
              </Link>
              , and{" "}
              {/* @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types */}
              <Link to="/docs/client-generation/framework-integrations#msw-mock-server">
                MSW
              </Link>
              .
            </p>
          </li>
          {/* <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon} aria-hidden="true">
              ⚡
            </span>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Performance</h3>
            <p>
              Bring your own validator: choose Zod v4 for runtime validation,
              swap in your own library, or skip validation entirely.
            </p>
          </li> */}
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon} aria-hidden="true">
              🔒
            </span>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>
              Type-Safe by Design
            </h3>
            <p>
              All schemas are fully typed. Supports multiple success status
              codes (2xx) and multiple content-types for both requests and
              responses.
            </p>
          </li>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon} aria-hidden="true">
              🌐
            </span>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>
              Efficient error handling
            </h3>
            <p>
              Provides discriminated unions for errors that can occur at
              different stages, such as during network requests or payload
              validation. Client calls never throw.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="OpenAPI to TypeScript Generator | @apical-ts/craft"
      description="Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications. Supports OpenAPI 2.0, 3.0.x, and 3.1.x with comprehensive validation, error handling, and minimal dependencies."
    >
      <HomepageHeader />
      <WhyChooseUs />
      {/* <main>
        <HomepageFeatures />
      </main> */}
    </Layout>
  );
}
