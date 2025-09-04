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
            className={className}
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
