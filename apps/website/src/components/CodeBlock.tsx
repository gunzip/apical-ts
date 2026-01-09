import React, { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language: string;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  className: outerClassName,
}) => {
  const [copied, setCopied] = useState(false);
  // Use a vibrant dark theme that works well with our custom dark background
  const resolvedTheme = themes.nightOwl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      // eslint-disable-next-line no-unused-vars
    } catch (_) {
      // fallback or error handling
    }
  };

  return (
    <>
      {/* @ts-expect-error - prism-react-renderer types are incompatible with React 18 types */}
      <Highlight
        code={code.trim()}
        language={language}
        theme={resolvedTheme}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <div
          className="codeblock-group"
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <style>{`
            .codeblock-copy-btn {
              position: absolute;
              top: 8px;
              right: 8px;
              z-index: 2;
              background: #f3f4f6;
              color: #111827;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 2px 10px;
              font-size: 12px;
              cursor: pointer;
              transition: background 0.2s, opacity 0.2s;
              opacity: 0;
              pointer-events: none;
            }
            .codeblock-group:hover .codeblock-copy-btn,
            .codeblock-copy-btn:focus {
              opacity: 1;
              pointer-events: auto;
            }
            .codeblock-copy-btn.copied {
              background: #d1fae5;
            }
          `}</style>
          <button
            onClick={handleCopy}
            className={`codeblock-copy-btn${copied ? " copied" : ""}`}
            aria-label="Copy code to clipboard"
            tabIndex={0}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <pre
            className={[className, outerClassName].filter(Boolean).join(" ")}
            style={{
              ...style,
              padding: 16,
              borderRadius: 8,
              overflowX: "auto",
              flex: 1,
              height: "100%",
              minHeight: 0,
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    </Highlight>
    </>
  );
};

export default CodeBlock;
