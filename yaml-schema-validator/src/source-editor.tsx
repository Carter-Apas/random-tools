import { Button, Tabs } from "@random-tools/mono";
import { Braces, FileUp, WrapText } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { HighlightedSource } from "./highlighted-source.tsx";

export type EditorTab = "yaml" | "schema";

export const SourceEditor = ({
  tab,
  onTabChange,
  source,
  filename,
  onChange,
  onImport,
  onFormat,
  canFormat,
}: {
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  source: string;
  filename: string;
  onChange: (source: string) => void;
  onImport: (file: File) => Promise<void>;
  onFormat: () => void;
  canFormat: boolean;
}) => {
  const input = useRef<HTMLInputElement>(null);

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void onImport(file);
  };

  return (
    <section className="mono-panel source-panel" aria-label="Source editor">
      <div className="source-tabs">
        <Tabs
          label="Document source"
          items={[
            { value: "yaml", label: "YAML" },
            { value: "schema", label: "Schema" },
          ]}
          value={tab}
          onChange={(value) => onTabChange(value as EditorTab)}
        />
      </div>
      <div className="editor-toolbar">
        <span className="filename">
          <Braces size={14} aria-hidden="true" />
          {filename}
        </span>
        <div className="button-group">
          <Button size="sm" variant="ghost" onClick={onFormat} disabled={!canFormat}>
            <WrapText size={14} aria-hidden="true" />
            Format
          </Button>
          <Button size="sm" onClick={() => input.current?.click()}>
            <FileUp size={14} aria-hidden="true" />
            Import
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          className="file-input"
          aria-label={`Import ${tab === "yaml" ? "YAML" : "schema"} file`}
          accept={
            tab === "yaml"
              ? ".yaml,.yml,.json,text/yaml,application/yaml,application/json"
              : ".yaml,.yml,.json,application/schema+json,application/json,text/yaml"
          }
          onChange={importFile}
          tabIndex={-1}
        />
      </div>
      <HighlightedSource
        source={source}
        label={tab === "yaml" ? "YAML document" : "JSON Schema"}
        onChange={onChange}
      />
      <div className="editor-footer" id="source-hint">
        <span>{tab === "yaml" ? "YAML 1.2" : "JSON Schema · YAML or JSON"}</span>
        <span>{source.split("\n").length} lines</span>
      </div>
    </section>
  );
};
