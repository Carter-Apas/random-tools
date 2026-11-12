import { Textarea } from "@random-tools/mono";
import Prism, { type Token } from "prismjs";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";

Prism.manual = true;

const renderToken = (token: string | Token, index: number): ReactNode => {
  if (typeof token === "string") return token;
  const content = Array.isArray(token.content)
    ? token.content.map(renderToken)
    : renderToken(token.content, 0);
  return (
    <span key={index} className={`syntax-token token-${token.type}`}>
      {content}
    </span>
  );
};

export const HighlightedSource = ({
  source,
  label,
  onChange,
}: {
  source: string;
  label: string;
  onChange: (source: string) => void;
}) => {
  const container = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLPreElement>(null);
  const language = ["{", "["].includes(source.trimStart()[0]) ? "json" : "yaml";
  const tokens = useMemo(
    () => Prism.tokenize(source + "\n", Prism.languages[language]),
    [source, language],
  );

  const syncScroll = () => {
    const editor = container.current?.querySelector("textarea");
    if (!editor || !highlight.current) return;
    highlight.current.scrollTop = editor.scrollTop;
    highlight.current.scrollLeft = editor.scrollLeft;
  };

  useLayoutEffect(syncScroll, [source]);

  return (
    <div ref={container} className="source-code">
      <pre ref={highlight} className="source-highlight" data-language={language} aria-hidden="true">
        <code>{tokens.map(renderToken)}</code>
      </pre>
      <Textarea
        id="source-input"
        className="source-input"
        aria-label={label}
        value={source}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby="source-hint"
      />
    </div>
  );
};
