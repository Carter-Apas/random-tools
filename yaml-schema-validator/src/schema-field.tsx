import {
  ADDITIONAL_PROPERTY_FLAG,
  getSchemaType,
  type FieldTemplateProps,
  type RJSFSchema,
} from "@rjsf/utils";
import { createElement, useContext, type ReactNode } from "react";

import { arrayActionsContext } from "./array-actions.ts";

const hintLabels: Record<string, string> = {
  type: "Type",
  minimum: "Minimum",
  maximum: "Maximum",
  minLength: "Min length",
  maxLength: "Max length",
  pattern: "Pattern",
  format: "Format",
  default: "Default",
  const: "Value",
};

const hintsFor = (schema: RJSFSchema) =>
  Object.entries(hintLabels)
    .filter(([key]) => Object.hasOwn(schema, key))
    .map(([key, label]) => {
      const value = schema[key];
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${label}: ${String(text).slice(0, 120)}`;
    });

const isContainer = (schema: RJSFSchema) => {
  const types = [getSchemaType(schema)].flat();
  return types.some((type) => type === "object" || type === "array");
};

const SectionLocation = ({ field }: { field: FieldTemplateProps<unknown> }) => {
  if (
    !isContainer(field.schema) ||
    field.fieldPathId.path.length < 2 ||
    ADDITIONAL_PROPERTY_FLAG in field.schema
  )
    return null;
  return (
    <p className="schema-section-location">
      <code>{field.fieldPathId.path.join(" / ")}</code>
    </p>
  );
};

const FieldContents = ({
  field,
  showLabel,
  buttons,
}: {
  field: FieldTemplateProps<unknown>;
  showLabel: boolean;
  buttons?: ReactNode;
}) => {
  const hints = showLabel ? hintsFor(field.schema) : [];
  const additional = ADDITIONAL_PROPERTY_FLAG in field.schema;
  return (
    <>
      {showLabel && (
        <label className="control-label" htmlFor={field.id}>
          {additional ? "Value" : field.label}
          {field.required && <span className="required">*</span>}
        </label>
      )}
      {showLabel && field.description}
      <SectionLocation field={field} />
      {buttons ? (
        <div
          className={`schema-array-control ${isContainer(field.schema) ? "schema-array-container" : ""}`}
        >
          <div className="schema-array-value">
            <arrayActionsContext.Provider value={null}>
              {field.children}
            </arrayActionsContext.Provider>
          </div>
          {buttons}
        </div>
      ) : (
        field.children
      )}
      {field.errors}
      {field.help}
      {hints.length > 0 && <p className="schema-hints">{hints.join(" · ")}</p>}
    </>
  );
};

export const SchemaField = (props: FieldTemplateProps<unknown>) => {
  const actions = useContext(arrayActionsContext);
  if (props.hidden) return <div hidden>{props.children}</div>;
  const showLabel = Boolean(props.displayLabel) && !isContainer(props.schema);
  const buttons = actions?.fieldId === props.id ? actions.buttons : undefined;
  return createElement(props.registry.templates.WrapIfAdditionalTemplate, {
    ...props,
    children: <FieldContents field={props} showLabel={showLabel} buttons={buttons} />,
  });
};
