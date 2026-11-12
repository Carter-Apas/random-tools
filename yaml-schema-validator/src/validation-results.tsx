import { Alert, Badge, Button } from "@random-tools/mono";
import { CheckCircle2, CircleAlert } from "lucide-react";

import type { ValidationIssue } from "./validation.ts";

const ValidationHeading = ({ count }: { count: number }) => (
  <div className="validation-heading">
    {count ? (
      <CircleAlert size={18} className="mono-danger-text" aria-hidden="true" />
    ) : (
      <CheckCircle2 size={18} className="mono-success-text" aria-hidden="true" />
    )}
    <div>
      <h2>{count ? "Does not match the schema" : "YAML matches the schema"}</h2>
      <p>
        {count
          ? "Fix the following values in the editor or the form."
          : "All values pass validation. Changes are checked as you type."}
      </p>
    </div>
    <Badge tone={count ? "danger" : "success"}>
      {count} {count === 1 ? "issue" : "issues"}
    </Badge>
  </div>
);

const IssueRow = ({
  issue,
  onLocate,
}: {
  issue: ValidationIssue;
  onLocate: (issue: ValidationIssue) => void;
}) => (
  <li>
    <div>
      <code>{issue.path}</code>
      <span>{issue.message}</span>
    </div>
    {issue.line && (
      <Button size="sm" variant="ghost" onClick={() => onLocate(issue)}>
        Line {issue.line}
      </Button>
    )}
  </li>
);

export const ValidationResults = ({
  schemaError,
  yamlError,
  issues,
  onLocate,
}: {
  schemaError?: string;
  yamlError?: string;
  issues: ValidationIssue[];
  onLocate: (issue: ValidationIssue) => void;
}) => {
  if (schemaError || yamlError) {
    return (
      <div className="validation-results">
        {schemaError && (
          <Alert title="Check the schema" tone="danger">
            {schemaError}
          </Alert>
        )}
        {yamlError && (
          <Alert title="Check the YAML" tone="danger">
            {yamlError}
          </Alert>
        )}
      </div>
    );
  }
  return (
    <section
      className="mono-panel validation-results"
      aria-label="Validation results"
      aria-live="polite"
    >
      <ValidationHeading count={issues.length} />
      {issues.length > 0 && (
        <ul className="issue-list">
          {issues.slice(0, 100).map((issue, index) => (
            <IssueRow key={`${issue.path}-${index}`} issue={issue} onLocate={onLocate} />
          ))}
        </ul>
      )}
      {issues.length > 100 && (
        <p className="issue-overflow">
          Showing the first 100 issues. Fix these to narrow down the remaining errors.
        </p>
      )}
    </section>
  );
};
