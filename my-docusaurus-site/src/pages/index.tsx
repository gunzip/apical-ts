import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/introduction">
            Get Started - 5min ⏱️
          </Link>
          <Link
            className="button button--outline button--lg margin-left--md"
            to="/docs/cli-usage">
            View CLI Docs 📖
          </Link>
        </div>
        <div className={styles.demoSection}>
          <img
            src="/img/demo.gif"
            alt="Demo of @apical-ts/craft generating TypeScript code from OpenAPI specifications"
            className={styles.demoGif}
          />
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="OpenAPI to TypeScript Generator"
      description="Turn your OpenAPI specifications into fully-typed Zod v4 schemas and type-safe REST API clients">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
