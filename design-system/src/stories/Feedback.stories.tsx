import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, FilePlus2, Plus } from "lucide-react";
import { useState } from "react";

import { Example, Page, Section } from "./catalog";

import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Panel,
  Progress,
  Skeleton,
} from "../components/primitives";

const meta = { title: "Components/Feedback" } satisfies Meta;
export default meta;
type Story = StoryObj;
const EmptyExample = () => {
  const [created, setCreated] = useState(false);
  return (
    <Panel>
      {created ? (
        <div style={{ padding: 28 }}>
          <Alert title="Comparison created" tone="success">
            Your new comparison is ready to edit.
          </Alert>
          <Button size="sm" variant="ghost" onClick={() => setCreated(false)}>
            Reset example
          </Button>
        </div>
      ) : (
        <EmptyState
          icon={<FilePlus2 size={21} />}
          title="Your first comparison starts here"
          description="Add a vehicle to see its annual running costs."
          action={
            <Button variant="primary" onClick={() => setCreated(true)}>
              <Plus size={14} /> Add a vehicle
            </Button>
          }
        />
      )}
    </Panel>
  );
};
export const Messages: Story = {
  render: () => (
    <Page
      title="Say what happened."
      description="Feedback is calm, specific, and useful. Colour reinforces the message; the icon and words carry its meaning."
    >
      <Section title="Messages">
        <div className="catalog-stack">
          <Alert title="Comparison saved" tone="success">
            You can come back to it any time.
          </Alert>
          <Alert title="A little more information" tone="info">
            These running costs include energy and road user charges.
          </Alert>
          <Alert title="Check your estimate" tone="warning">
            Your annual distance is higher than usual. Confirm it before continuing.
          </Alert>
          <Alert title="Could not load market prices" tone="danger">
            Check your connection, then try again.
          </Alert>
        </div>
      </Section>
      <Section title="Compact status">
        <Example title="Badges">
          <div className="catalog-row">
            <Badge>Draft</Badge>
            <Badge tone="accent">In progress</Badge>
            <Badge tone="success">
              <Check size={11} /> Saved
            </Badge>
            <Badge tone="danger">Needs attention</Badge>
          </div>
        </Example>
      </Section>
      <Section title="Progress">
        <Example title="Packing checklist">
          <div className="catalog-stack">
            <span className="mono-muted">2 of 4 items packed</span>
            <Progress label="Items packed" value={50} />
          </div>
        </Example>
      </Section>
    </Page>
  ),
};
export const EmptyAndLoading: Story = {
  render: () => (
    <Page
      title="Every state deserves a design."
      description="Give empty screens a next step. Keep loading placeholders close to the shape of the content that is coming."
    >
      <Section title="Empty state">
        <EmptyExample />
      </Section>
      <Section title="Loading">
        <Panel aria-busy="true" aria-label="Loading comparisons">
          <div className="catalog-stack" style={{ padding: 28 }}>
            <Skeleton width="35%" height={20} />
            <Skeleton width="65%" />
            <Skeleton width="100%" height={80} />
            <Skeleton width="45%" />
          </div>
        </Panel>
      </Section>
    </Page>
  ),
};
