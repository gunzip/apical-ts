import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import CodeBlock from "../components/CodeBlock";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
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
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/introduction"
          >
            Get Started in 5min ⏱️
          </Link>
          {/* <Link
            className="button button--secondary button--lg margin-left--md"
            to="/docs/cli-usage"
          >
            View CLI Docs 📖
          </Link> */}
        </div>
        <div className={styles.demoSection}>
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>CLI</div>
            <CodeBlock
              code={`npx @apical-ts/craft generate\n -i https://petstore.swagger.io/v2/swagger.json\n -o ./generated\n --generate-client\n`}
              language="bash"
            />
          </div>
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>TypeScript</div>
            <CodeBlock
              code={`import { findPetsByStatus } from './generated/operations/findPetsByStatus.js';

  const r = await findPetsByStatus({
    query: { status: "available" },
  });
  if (r.isValid === true && r.status === 200) {
    // Zod v4 parsed payload
    console.log(r.parsed[0].name);
  }`}
              language="typescript"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function WhyChooseUs() {
  return (
    <section className={styles.whyChooseSection}>
      <div className="container">
        {/* <div className={styles.whyChooseTitle}>Why @apical-ts/craft?</div> */}
        <ul className={styles.whyChooseList}>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon}>🧩</span>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Modular & Tree-shakable
            </div>
            <div>
              Import only what you need. No bloat, minimal dependencies, no dead
              code.
            </div>
          </li>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon}>⚡</span>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Performance</div>
            <div>
              Bring your own validator: choose Zod v4 for runtime validation,
              swap in your own library, or skip validation entirely.
            </div>
          </li>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon}>🔒</span>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Type-Safe by Design
            </div>
            <div>
              All schemas are fully typed. Supports multiple success status
              codes (2xx) and multiple content-types for both requests and
              responses.
            </div>
          </li>
          <li className={styles.whyChooseItem}>
            <span className={styles.whyChooseIcon}>🌐</span>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Efficient error handling
            </div>
            <div>
              Provides discriminated unions for errors that can occur at
              different stages, such as during network requests or payload
              validation. Client calls never throw.
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="OpenAPI to TypeScript Generator"
      description="Turn your OpenAPI specifications into fully-typed Zod v4 schemas and type-safe REST API clients"
    >
      <HomepageHeader />
      <WhyChooseUs />
      {/* <main>
        <HomepageFeatures />
      </main> */}
    </Layout>
  );
}
