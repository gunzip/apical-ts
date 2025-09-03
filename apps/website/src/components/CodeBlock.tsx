import React, { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      // fallback or error handling
    }
  };

  return (
    <Highlight
      code={code.trim()}
      language={language}
      theme={themes.github}
      children={({ className, style, tokens, getLineProps, getTokenProps }) => (
        <div style={{ position: "relative" }}>
          <button
            onClick={handleCopy}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              background: copied ? "#d1fae5" : "#f3f4f6",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              padding: "2px 10px",
              fontSize: 12,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            aria-label="Copy code to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <pre
            className={className}
            style={{
              ...style,
              padding: 16,
              borderRadius: 8,
              overflowX: "auto",
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    />
  );
};

export default CodeBlock;
