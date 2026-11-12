import { Badge, Button, EmptyState } from "@random-tools/mono";
import { FileCode2 } from "lucide-react";

import type { ParsedYaml } from "./document.ts";
import { SchemaForm } from "./schema-form.tsx";
import type { CompiledSchema } from "./validation.ts";

export const OptionsPanel = ({
  compiled,
  parsed,
  sourceRevision,
  recoveryKey,
  onChange,
  onOpenSource,
}: {
  compiled?: CompiledSchema;
  parsed?: ParsedYaml;
  sourceRevision: number;
  recoveryKey: string;
  onChange: (data: unknown) => void;
  onOpenSource: () => void;
}) => (
  <section className="mono-panel options-panel" aria-labelledby="options-heading">
    <div className="options-header">
      <FileCode2 size={17} aria-hidden="true" />
      <h2 id="options-heading">Schema options</h2>
      <Badge>Live form</Badge>
    </div>
    <div className="options-body">
      {compiled && parsed ? (
        <SchemaForm
          key={sourceRevision}
          compiled={compiled}
          data={parsed.data}
          recoveryKey={recoveryKey}
          onChange={onChange}
        />
      ) : (
        <EmptyState
          icon={<FileCode2 size={20} />}
          title="Your schema becomes a form"
          description="Enter a valid schema and YAML document to see the available fields, choices, and descriptions."
          action={
            <Button size="sm" onClick={onOpenSource}>
              Open source
            </Button>
          }
        />
      )}
    </div>
    <p className="options-note">
      Form changes update the YAML. Required fields are marked with an asterisk.
    </p>
  </section>
);
