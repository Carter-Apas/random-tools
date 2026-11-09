import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Example, Page, Section } from "./catalog";

import { Alert, Button, Dialog, Field } from "../components/primitives";

const meta = { title: "Components/Dialog" } satisfies Meta;
export default meta;
type Story = StoryObj;
const DialogExample = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Daily commute");
  const [saved, setSaved] = useState(false);
  return (
    <div className="catalog-stack">
      <div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Save comparison
        </Button>
      </div>
      {saved && (
        <Alert title={`${name} saved`} tone="success">
          Your comparison is ready to use.
        </Alert>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Save comparison"
        description="Give this estimate a name so it is easy to find later."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" form="dialog-example" type="submit">
              Save comparison
            </Button>
          </>
        }
      >
        <form
          id="dialog-example"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
            setOpen(false);
          }}
        >
          <Field
            label="Comparison name"
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </form>
      </Dialog>
    </div>
  );
};
export const SaveComparison: Story = {
  render: () => (
    <Page
      title="A moment of focus."
      description="Use a dialog for a short, self-contained task. A native modal keeps focus inside, supports Escape, and returns focus to the trigger when closed."
    >
      <Section title="Save a comparison">
        <Example title="Dialog interaction">
          <DialogExample />
        </Example>
      </Section>
    </Page>
  ),
};
