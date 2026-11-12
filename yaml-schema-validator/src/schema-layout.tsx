import { Field } from "@random-tools/mono";
import {
  ADDITIONAL_PROPERTY_FLAG,
  RJSF_REF_CYCLE_KEY,
  buttonId,
  type ArrayFieldItemTemplateProps,
  type WrapIfAdditionalTemplateProps,
} from "@rjsf/utils";
import { createElement } from "react";

import { arrayActionsContext } from "./array-actions.ts";

export const ArrayItem = ({
  children,
  className,
  buttonsProps,
  hasToolbar,
  registry,
  schema,
}: ArrayFieldItemTemplateProps<unknown>) => {
  const buttons = hasToolbar ? (
    <div className="schema-array-actions">
      {createElement(registry.templates.ArrayFieldItemButtonsTemplate, buttonsProps)}
    </div>
  ) : null;
  if (Object.keys(schema).length === 0 || RJSF_REF_CYCLE_KEY in schema) {
    return (
      <div className={`${className} schema-array-item`}>
        {children}
        {buttons}
      </div>
    );
  }
  return (
    <arrayActionsContext.Provider value={{ fieldId: buttonsProps.fieldPathId.$id, buttons }}>
      <div className={`${className} schema-array-item`}>{children}</div>
    </arrayActionsContext.Provider>
  );
};

export const PropertyWrapper = ({
  id,
  classNames = "",
  style,
  disabled,
  readonly,
  schema,
  label,
  onKeyRenameBlur,
  onRemoveProperty,
  rawErrors,
  hideError,
  children,
  registry,
  uiSchema,
}: WrapIfAdditionalTemplateProps<unknown>) => {
  const hasErrors = !hideError && Boolean(rawErrors?.length);
  const classes = `form-group ${classNames} ${hasErrors ? "has-error has-danger" : ""}`;
  if (!(ADDITIONAL_PROPERTY_FLAG in schema))
    return (
      <div className={classes} style={style}>
        {children}
      </div>
    );
  const { RemoveButton } = registry.templates.ButtonTemplates;
  return (
    <div className={`${classes} additional-property`} style={style}>
      <div className="additional-property-header">
        <Field
          key={label}
          id={`${id}-key`}
          label="Property name"
          defaultValue={label}
          onBlur={onKeyRenameBlur}
          disabled={disabled}
          readOnly={readonly}
        />
        <RemoveButton
          id={buttonId(id, "remove")}
          onClick={onRemoveProperty}
          disabled={disabled || readonly}
          title={`Remove property ${label}`}
          registry={registry}
          uiSchema={uiSchema}
        />
      </div>
      <div className="additional-property-value">{children}</div>
    </div>
  );
};
