import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '🎯 Operation-Based Architecture',
    Svg: require('@site/static/img/operation-architecture.svg').default,
    description: (
      <>
        Each API operation becomes a standalone, typed function. Import only what you need
        with full tree-shaking support and crystal-clear separation of concerns.
      </>
    ),
  },
  {
    title: '🛡️ Runtime Type Safety',
    Svg: require('@site/static/img/type-safety.svg').default,
    description: (
      <>
        Built on Zod v4 for robust runtime validation. Catch API contract violations
        early with comprehensive schema validation and type inference.
      </>
    ),
  },
  {
    title: '🔄 Universal OpenAPI Support',
    Svg: require('@site/static/img/openapi-support.svg').default,
    description: (
      <>
        Supports OpenAPI 2.0, 3.0.x, and 3.1.x with automatic normalization.
        Works with local files, remote URLs, and complex reference resolution.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
