import { Alert, AppHeader, AppThemeProvider, Badge, Button } from "@random-tools/mono";
import { Check, Copy, Download, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import {
  attempt,
  errorMessage,
  maxSourceLength,
  readYaml,
  updateYaml,
  type JsonValue,
} from "./document.ts";
import { exampleSchema, exampleYaml } from "./example.ts";
import { OptionsPanel } from "./options-panel.tsx";
import { SourceEditor, type EditorTab } from "./source-editor.tsx";
import { compileSchema, validateYaml, type ValidationIssue } from "./validation.ts";
import { ValidationResults } from "./validation-results.tsx";

const locateIssue = (issue: ValidationIssue, source: string) => {
  const editor = document.getElementById("source-input");
  if (!(editor instanceof HTMLTextAreaElement) || !issue.line) return;
  const lines = source.split("\n");
  const start = lines.slice(0, issue.line - 1).reduce((sum, line) => sum + line.length + 1, 0);
  editor.focus();
  editor.setSelectionRange(start, start + (lines[issue.line - 1]?.length ?? 0));
  editor.scrollTop = Math.max(0, (issue.line - 3) * 22);
};

const downloadYaml = (source: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([source], { type: "application/yaml;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/\.[^.]+$/, "") + ".yaml";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const App = () => {
  const [yaml, setYaml] = useState(exampleYaml);
  const [schema, setSchema] = useState(exampleSchema);
  const [tab, setTab] = useState<EditorTab>("yaml");
  const [yamlFilename, setYamlFilename] = useState("config.yaml");
  const [schemaFilename, setSchemaFilename] = useState("schema.yaml");
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [sourceRevision, setSourceRevision] = useState(0);
  const parsed = useMemo(() => attempt(() => readYaml(yaml)), [yaml]);
  const compiled = useMemo(() => attempt(() => compileSchema(schema)), [schema]);
  const validation = useMemo(
    () =>
      attempt(() =>
        compiled.value && parsed.value ? validateYaml(compiled.value, parsed.value) : [],
      ),
    [compiled, parsed],
  );
  const source = tab === "yaml" ? yaml : schema;

  const editSource = (next: string) => {
    setNotice(undefined);
    setCopied(false);
    setSourceRevision((revision) => revision + 1);
    if (tab === "yaml") setYaml(next);
    else setSchema(next);
  };

  const importFile = async (file: File) => {
    try {
      if (file.size > maxSourceLength) throw new Error("Keep each file under 1 MB.");
      const content = await file.text();
      if (tab === "yaml") {
        setYaml(content);
        setYamlFilename(file.name);
      } else {
        setSchema(content);
        setSchemaFilename(file.name);
      }
      setNotice(undefined);
      setCopied(false);
      setSourceRevision((revision) => revision + 1);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const editForm = (data: unknown) => {
    try {
      const clean: JsonValue = JSON.parse(JSON.stringify(data));
      setYaml(updateYaml(yaml, clean));
      setCopied(false);
      setNotice(undefined);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setNotice(undefined);
    } catch {
      setNotice(
        "Copy is unavailable in this browser context. Select the YAML to copy it, or use Download YAML.",
      );
    }
  };

  const format = () => {
    const result = attempt(() => {
      const current = readYaml(source);
      return tab === "schema" && source.trimStart().startsWith("{")
        ? JSON.stringify(current.data, null, 2) + "\n"
        : current.document.toString({ lineWidth: 100 });
    });
    if (result.value !== undefined) editSource(result.value);
    else setNotice(result.error);
  };

  const loadExample = () => {
    setYaml(exampleYaml);
    setSchema(exampleSchema);
    setYamlFilename("config.yaml");
    setSchemaFilename("schema.yaml");
    setNotice(undefined);
    setCopied(false);
    setSourceRevision((revision) => revision + 1);
  };

  return (
    <AppThemeProvider>
      <div className="mono-app-content validator-app">
        <AppHeader title="YAML schema validator" />
        <main>
          <div className="page-intro">
            <div>
              <h1>Configuration, checked.</h1>
              <p>Validate your YAML and explore the options in its schema.</p>
            </div>
            <Badge>
              <ShieldCheck size={13} aria-hidden="true" />
              Runs in your browser
            </Badge>
          </div>
          <div className="workspace-toolbar">
            <Button size="sm" onClick={loadExample}>
              <RotateCcw size={14} aria-hidden="true" />
              Load example
            </Button>
            <div className="button-group">
              <Button size="sm" onClick={() => void copy()}>
                {copied ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy YAML"}
              </Button>
              <Button size="sm" variant="primary" onClick={() => downloadYaml(yaml, yamlFilename)}>
                <Download size={14} aria-hidden="true" />
                Download YAML
              </Button>
            </div>
          </div>
          {notice && (
            <div className="notice">
              <Alert title="File action" tone="warning">
                {notice}
              </Alert>
            </div>
          )}
          <div className="workspace">
            <SourceEditor
              tab={tab}
              onTabChange={setTab}
              source={source}
              filename={tab === "yaml" ? yamlFilename : schemaFilename}
              onChange={editSource}
              onImport={importFile}
              onFormat={format}
              canFormat={tab === "yaml" ? Boolean(parsed.value) : Boolean(compiled.value)}
            />
            <OptionsPanel
              compiled={compiled.value}
              parsed={parsed.value}
              sourceRevision={sourceRevision}
              recoveryKey={schema + yaml}
              onChange={editForm}
              onOpenSource={() => setTab(compiled.error ? "schema" : "yaml")}
            />
          </div>
          <ValidationResults
            schemaError={compiled.error}
            yamlError={parsed.error ?? validation.error}
            issues={validation.value ?? []}
            onLocate={(issue) => {
              setTab("yaml");
              requestAnimationFrame(() => locateIssue(issue, yaml));
            }}
          />
          <footer className="page-footer">
            <p>
              <ShieldCheck size={14} aria-hidden="true" />
              Your documents stay in this tab. No uploads, accounts, or saved document history.
            </p>
            <details>
              <summary>Schema support</summary>
              <p>
                Paste or import JSON Schema draft 2020-12 or draft-07 as JSON or YAML in the Schema
                tab. The form shows types, enums, nested objects, arrays, descriptions, defaults,
                and schema alternatives. References must resolve inside the supplied schema;
                external schemas and URLs are never fetched. Without a $schema declaration, draft-07
                is used. A YAML file alone does not describe all allowed options.
              </p>
              <p>
                Validation checks the original document without adding defaults or converting types.
                Form edits preserve comments on unchanged mappings; edited arrays are rewritten and
                aliases expanded. Documents use YAML 1.2 with string keys and JSON-compatible
                values.
              </p>
            </details>
          </footer>
        </main>
      </div>
    </AppThemeProvider>
  );
};
