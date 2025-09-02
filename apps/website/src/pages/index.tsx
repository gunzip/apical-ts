import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
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
        <div className={styles.heroSubBold}>
          Production-grade, blazing fast, fully-typed OpenAPI generator
        </div>
        <p className={clsx("hero__subtitle", styles.heroSubtitle)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/introduction"
          >
            Get Started - 5min ⏱️
          </Link>
          <Link
            className="button button--secondary button--lg margin-left--md"
            to="/docs/cli-usage"
          >
            View CLI Docs 📖
          </Link>
        </div>
        <div className={styles.demoSection}>
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>CLI Example</div>
            <pre className={styles.codeBlock}>
              <code>{`pnpm start generate -i openapi.yaml -o ./generated --generate-client`}</code>
            </pre>
          </div>
          <div className={styles.codeExample}>
            <div className={styles.codeBlockLabel}>TypeScript Example</div>
            <pre className={styles.codeBlock}>
              <code>{`import { getPetById } from './generated/operations';

const result = await getPetById({ petId: '123' });

// result.data is fully typed and validated by Zod!
console.log(result.data.name); // string
`}</code>
            </pre>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsSection() {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>Type Safety</div>
            <div className={styles.statDescription}>
              Runtime validation with Zod
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>5x</div>
            <div className={styles.statLabel}>Faster Development</div>
            <div className={styles.statDescription}>
              Compared to manual client creation
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>Zero</div>
            <div className={styles.statLabel}>Configuration</div>
            <div className={styles.statDescription}>Works out of the box</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>∞</div>
            <div className={styles.statLabel}>OpenAPI Support</div>
            <div className={styles.statDescription}>
              2.0, 3.0.x, 3.1.x compatible
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  return (
    <section className={styles.whyChoose}>
      <div className={styles.whyChooseTitle}>Why Choose @apical-ts/craft?</div>
      <ul className={styles.whyChooseList}>
        <li className={styles.whyChooseItem}>
          <span className={styles.whyChooseIcon}>⚡</span>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Lightning Fast</div>
          <div>
            Concurrent code generation and optimized output for large specs.
          </div>
        </li>
        <li className={styles.whyChooseItem}>
          <span className={styles.whyChooseIcon}>🔒</span>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Type-Safe by Design
          </div>
          <div>
            All schemas and clients are fully typed and runtime validated with
            Zod.
          </div>
        </li>
        <li className={styles.whyChooseItem}>
          <span className={styles.whyChooseIcon}>🧩</span>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Modular & Tree-shakable
          </div>
          <div>Import only what you need. No bloat, no dead code.</div>
        </li>
        <li className={styles.whyChooseItem}>
          <span className={styles.whyChooseIcon}>🌐</span>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Universal OpenAPI Support
          </div>
          <div>
            Works with OpenAPI 2.0, 3.0.x, 3.1.x, YAML & JSON, local or remote.
          </div>
        </li>
      </ul>
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
      <StatsSection />
      <WhyChooseUs />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
