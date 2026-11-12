import { Alert, Button, Input, Switch } from "@random-tools/mono";
import Form from "@rjsf/core";
import {
  getInputProps,
  type BaseInputTemplateProps,
  type IconButtonProps,
  type WidgetProps,
} from "@rjsf/utils";
import { ArrowDown, ArrowUp, Plus, Trash2, type LucideIcon } from "lucide-react";
import { Component, type ReactNode } from "react";

import { errorMessage, type JsonValue } from "./document.ts";
import { SchemaField } from "./schema-field.tsx";
import { ArrayItem, PropertyWrapper } from "./schema-layout.tsx";
import type { CompiledSchema } from "./validation.ts";

const BaseInput = ({
  id,
  value,
  type,
  schema,
  options,
  required,
  readonly,
  disabled,
  placeholder,
  rawErrors,
  onChange,
  onChangeOverride,
  onBlur,
  onFocus,
}: BaseInputTemplateProps<unknown>) => (
  <Input
    {...getInputProps(schema, type, options)}
    id={id}
    value={value ?? ""}
    required={required}
    readOnly={readonly}
    disabled={disabled}
    placeholder={placeholder}
    aria-invalid={Boolean(rawErrors?.length)}
    onChange={
      onChangeOverride ??
      ((event) => onChange(event.target.value === "" ? options.emptyValue : event.target.value))
    }
    onBlur={(event) => onBlur(id, event.target.value)}
    onFocus={(event) => onFocus(id, event.target.value)}
  />
);

const BooleanWidget = ({
  id,
  label,
  value,
  readonly,
  disabled,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps<unknown>) => (
  <Switch
    id={id}
    label={label}
    checked={value === true}
    disabled={disabled || readonly}
    onChange={(event) => onChange(event.target.checked)}
    onBlur={(event) => onBlur(id, event.target.checked)}
    onFocus={(event) => onFocus(id, event.target.checked)}
  />
);

const actionButton = (label: string, icon: LucideIcon) => {
  const Icon = icon;

  const Action = ({ id, className, onClick, disabled, title }: IconButtonProps<unknown>) => (
    <Button
      id={id}
      className={className}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );

  return Action;
};

const templates = {
  FieldTemplate: SchemaField,
  ArrayFieldItemTemplate: ArrayItem,
  WrapIfAdditionalTemplate: PropertyWrapper,
  BaseInputTemplate: BaseInput,
  ButtonTemplates: {
    AddButton: actionButton("Add", Plus),
    RemoveButton: actionButton("Remove", Trash2),
    MoveUpButton: actionButton("Move up", ArrowUp),
    MoveDownButton: actionButton("Move down", ArrowDown),
  },
};

const widgets = { CheckboxWidget: BooleanWidget };

interface BoundaryProps {
  children: ReactNode;
  recoveryKey: string;
}

class FormBoundary extends Component<BoundaryProps, { error?: string }> {
  state: { error?: string } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error: errorMessage(error) };
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.error && previous.recoveryKey !== this.props.recoveryKey) {
      this.setState({ error: undefined });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Alert title="This schema cannot be shown as a form" tone="warning">
          {this.state.error} You can continue editing and validating the YAML directly.
        </Alert>
      );
    }
    return this.props.children;
  }
}

export const SchemaForm = ({
  compiled,
  data,
  recoveryKey,
  onChange,
}: {
  compiled: CompiledSchema;
  data: JsonValue;
  recoveryKey: string;
  onChange: (data: unknown) => void;
}) => (
  <FormBoundary recoveryKey={recoveryKey}>
    <Form<unknown>
      schema={compiled.schema}
      validator={compiled.validator}
      formData={data}
      className="schema-form"
      templates={templates}
      widgets={widgets}
      showErrorList={false}
      noHtml5Validate
      liveValidate
      experimental_defaultFormStateBehavior={{
        emptyObjectFields: "skipDefaults",
        arrayMinItems: { populate: "never" },
        constAsDefaults: "never",
      }}
      onChange={(event, id) => {
        if (id && event.formData !== undefined) onChange(event.formData);
      }}
    >
      <></>
    </Form>
  </FormBoundary>
);
