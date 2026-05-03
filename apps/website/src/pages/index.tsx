import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
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

const heroHighlights = [
  {
    label: "Reusable output",
    value: "Generate schemas, routes, client operations, and server wrappers.",
  },
  {
    label: "Large specs",
    value: "Selective imports keep very large APIs practical in real apps.",
  },
  {
    label: "Safe responses",
    value: "Narrowed responses, discriminated by status code and content type.",
  },
] as const;

const outputOrder = ["schema", "route", "client", "server"] as const;
type OutputExampleId = (typeof outputOrder)[number];

function getAdjacentOutputId(
  currentOutputId: OutputExampleId,
  direction: -1 | 1,
): OutputExampleId {
  const currentIndex = outputOrder.indexOf(currentOutputId);
  const nextIndex =
    (currentIndex + direction + outputOrder.length) % outputOrder.length;

  return outputOrder[nextIndex];
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => {
    return (
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true"
    );
  });
}

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

const featureCards = [
  {
    index: "Exact contract layer",
    title: "Make the generated contract the source of truth",
    description:
      "Generate precise request, response, and route shapes once, then reuse them across frontend code, server handlers, tests, and custom tooling.",
  },
  {
    index: "No framework lock-in",
    title: "Keep your runtime choices open",
    description:
      "Apical generates the hard layer first. Plug it into Hono, Express, MSW, React Query, or your own adapters without getting trapped in a plugin.",
  },
  {
    index: "Scales with the spec",
    title: "Stay practical on very large APIs",
    description:
      "Operation-level output and selective imports keep large OpenAPI documents usable in application code instead of collapsing into one oversized client.",
  },
  {
    index: "Agent-friendly typing",
    title: "Give coding agents safer primitives",
    description:
      "Discriminated response unions and exact request shapes help generated and agent-written code branch safely and stay aligned with the API contract.",
  },
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Point at one OpenAPI document",
    description:
      "Use a local file or URL and keep one contract as the source of truth for every generated layer.",
  },
  {
    step: "02",
    title: "Generate the layers you need",
    description:
      "Emit Zod schemas, route metadata, client operations, and server wrappers from the same spec.",
  },
  {
    step: "03",
    title: "Compose your own integrations",
    description:
      "Use the generated output directly or build custom adapters around it for frameworks, tests, and internal tooling.",
  },
] as const;

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

const resourceCards = [
  {
    title: "Get started",
    description:
      "Install the package, run the generator, and inspect the output structure end to end.",
    to: "/docs/introduction",
    meta: "Documentation",
  },
  {
    title: "Learn the CLI",
    description:
      "Review flags like --client, --server, and --routes with concrete command examples.",
    to: "/docs/cli-usage",
    meta: "Command reference",
  },
  {
    title: "Browse integration patterns",
    description:
      "See how generated contracts plug into framework glue, mock servers, and custom tooling.",
    to: "/docs/schema-generation/framework-integrations",
    meta: "Examples and patterns",
  },
] as const;

function HomepageLink(props: ComponentProps<typeof Link>) {
  // @ts-ignore - React 19 includes bigint in ReactNode but Docusaurus uses React 18 types.
  return <Link {...props} />;
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const [openOutputId, setOpenOutputId] = useState<OutputExampleId | null>(
    null,
  );
  const activeOutput = openOutputId ? outputExamples[openOutputId] : null;
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const outputButtonRefs = useRef<
    Record<OutputExampleId, HTMLButtonElement | null>
  >({
    schema: null,
    route: null,
    client: null,
    server: null,
  });

  const openOutput = (
    outputId: OutputExampleId,
    triggerElement?: HTMLElement | null,
  ) => {
    restoreFocusRef.current =
      triggerElement ??
      outputButtonRefs.current[outputId] ??
      restoreFocusRef.current;
    setOpenOutputId(outputId);
  };

  const closeOutput = () => {
    const restoreTarget = restoreFocusRef.current;
    setOpenOutputId(null);
    requestAnimationFrame(() => {
      restoreTarget?.focus();
    });
  };

  const showAdjacentOutput = (direction: -1 | 1) => {
    if (!openOutputId) {
      return;
    }

    const nextOutputId = getAdjacentOutputId(openOutputId, direction);
    restoreFocusRef.current = outputButtonRefs.current[nextOutputId];
    setOpenOutputId(nextOutputId);
  };

  useEffect(() => {
    if (!openOutputId) {
      return;
    }

    if (!modalRef.current?.contains(document.activeElement)) {
      closeButtonRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOutput();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showAdjacentOutput(1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showAdjacentOutput(-1);
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const isInsideModal =
        activeElement instanceof HTMLElement &&
        modalRef.current.contains(activeElement);

      if (event.shiftKey) {
        if (activeElement === firstElement || !isInsideModal) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openOutputId]);

  const handleOutputButtonClick = (
    outputId: OutputExampleId,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    openOutput(outputId, event.currentTarget);
  };

  const handleOutputButtonKeyDown = (
    outputId: OutputExampleId,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextOutputId = getAdjacentOutputId(outputId, 1);
      openOutput(
        nextOutputId,
        outputButtonRefs.current[nextOutputId] ?? event.currentTarget,
      );
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const previousOutputId = getAdjacentOutputId(outputId, -1);
      openOutput(
        previousOutputId,
        outputButtonRefs.current[previousOutputId] ?? event.currentTarget,
      );
    }
  };

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
            Use the generated contract directly or compose Hono, MSW, React
            Query, and custom adapters without drifting away from the spec. The
            same precision gives coding agents safer primitives.
          </p>
          <ul className={styles.proofGrid}>
            {heroHighlights.map((highlight) => (
              <li key={highlight.label} className={styles.proofItem}>
                <span className={styles.proofLabel}>{highlight.label}</span>
                <span className={styles.proofValue}>{highlight.value}</span>
              </li>
            ))}
          </ul>
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

          <div className={styles.outputCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewPill}>generated output</span>
              <span className={styles.previewCaption}>Reusable layers</span>
            </div>
            <div className={styles.outputBody}>
              <p className={styles.outputSummary}>
                Click a layer to open a minimal generated example.
              </p>
              <ul className={styles.outputList}>
                {outputOrder.map((outputId) => {
                  const output = outputExamples[outputId];

                  return (
                    <li key={outputId}>
                      <button
                        type="button"
                        ref={(element) => {
                          outputButtonRefs.current[outputId] = element;
                        }}
                        className={clsx(
                          styles.outputButton,
                          outputId === openOutputId &&
                            styles.outputButtonActive,
                        )}
                        onClick={(event) =>
                          handleOutputButtonClick(outputId, event)
                        }
                        onKeyDown={(event) =>
                          handleOutputButtonKeyDown(outputId, event)
                        }
                        aria-haspopup="dialog"
                        aria-expanded={outputId === openOutputId}
                      >
                        <span className={styles.outputTitle}>
                          {output.title}
                        </span>
                        <span className={styles.outputPath}>{output.path}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {activeOutput && (
        <div className={styles.outputModalBackdrop} onClick={closeOutput}>
          <div
            ref={modalRef}
            className={styles.outputModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-output-example-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.outputModalHeader}>
              <div>
                <span
                  id="homepage-output-example-title"
                  className={styles.outputModalTitle}
                >
                  {activeOutput.title} example
                </span>
                <span className={styles.outputModalMeta}>
                  {activeOutput.path}
                </span>
              </div>
              <div className={styles.outputModalActions}>
                <button
                  type="button"
                  className={styles.outputModalNav}
                  onClick={() => showAdjacentOutput(-1)}
                >
                  <span aria-hidden="true">←</span>
                  Previous
                </button>
                <button
                  type="button"
                  className={styles.outputModalNav}
                  onClick={() => showAdjacentOutput(1)}
                >
                  Next
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className={styles.outputModalClose}
                  onClick={closeOutput}
                >
                  Close
                </button>
              </div>
            </div>
            <p className={styles.outputModalLead}>{activeOutput.note}</p>
            <CodeBlock
              className={clsx(styles.previewCode, styles.outputModalCode)}
              code={activeOutput.code}
              language={activeOutput.language}
            />
          </div>
        </div>
      )}
    </header>
  );
}

function FeatureSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>Why teams keep it</p>
          <Heading as="h2" className={styles.sectionTitle}>
            A contract layer worth generating once.
          </Heading>
          <p className={styles.sectionLead}>
            The generated client is useful, but the durable asset is the exact
            contract layer underneath it: schemas and route metadata you can
            reuse everywhere TypeScript touches the API.
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

function WorkflowSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <Heading as="h2" className={styles.sectionTitle}>
            One spec in, reusable layers out.
          </Heading>
          <p className={styles.sectionLead}>
            Start from a single OpenAPI document, generate the pieces you need,
            and keep your app-specific glue code thin and inspectable.
          </p>
        </div>

        <div className={styles.workflowGrid}>
          {workflowSteps.map((step) => (
            <article key={step.step} className={styles.workflowCard}>
              <span className={styles.workflowStep}>{step.step}</span>
              <Heading as="h3" className={styles.workflowTitle}>
                {step.title}
              </Heading>
              <p className={styles.workflowDescription}>{step.description}</p>
            </article>
          ))}
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

function ResourceSection() {
  return (
    <section className={styles.section}>
      <div className={clsx("container", styles.sectionStack)}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>Start here</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Pick the shortest path to shipping.
          </Heading>
          <p className={styles.sectionLead}>
            Use the docs to get the generator running quickly, then drill into
            CLI flags and integration patterns only where your stack needs them.
          </p>
        </div>

        <div className={styles.resourceGrid}>
          {resourceCards.map((resource) => (
            <HomepageLink
              key={resource.title}
              className={styles.resourceCard}
              to={resource.to}
            >
              <Heading as="h3" className={styles.resourceTitle}>
                {resource.title}
              </Heading>
              <p className={styles.resourceDescription}>
                {resource.description}
              </p>
              <span className={styles.resourceMeta}>{resource.meta}</span>
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
          <FeatureSection />
          <WorkflowSection />
          <IntegrationSection />
          <ResourceSection />
        </main>
      </div>
    </Layout>
  );
}
