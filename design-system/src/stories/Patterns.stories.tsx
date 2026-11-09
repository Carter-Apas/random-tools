import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ChecklistDemo,
  CostCalculator,
  Page,
  PlannerDemo,
  PreferencesDemo,
  QuizDemo,
  Section,
  ToolDirectory,
} from "./catalog";

const meta = { title: "Patterns/Tools" } satisfies Meta;
export default meta;

type Story = StoryObj;

export const Calculator: Story = {
  render: () => (
    <Page
      title="Car cost comparison."
      description="A focused calculator pattern: choose a mode, enter a few values, and see the result. This is a design preview using illustrative assumptions."
    >
      <Section title="Annual estimate">
        <CostCalculator />
      </Section>
    </Page>
  ),
};
export const Checklist: Story = {
  render: () => (
    <Page
      title="Ready for the water."
      description="A checklist pattern with clear progress, compact groups, and preferences that stay out of the way."
    >
      <Section title="Packing for a trip">
        <div className="catalog-grid-two">
          <ChecklistDemo />
          <PreferencesDemo />
        </div>
      </Section>
    </Page>
  ),
};
export const Planner: Story = {
  render: () => (
    <Page
      title="A clearer financial picture."
      description="A planner pattern that gives the important numbers room to breathe. Change the monthly contribution to see the annual target update."
    >
      <Section title="Portfolio overview">
        <PlannerDemo />
      </Section>
    </Page>
  ),
};
export const Quiz: Story = {
  render: () => (
    <Page
      title="A good question."
      description="The same foundations, with a little more space. Choose an answer to see feedback, then try again."
    >
      <Section title="Question view">
        <QuizDemo />
      </Section>
    </Page>
  ),
};
export const Directory: Story = {
  render: () => (
    <Page
      title="Everything in its place."
      description="A common entry point for the tools. Search by name, filter by category, or open a tool preview."
    >
      <Section title="App directory">
        <ToolDirectory />
      </Section>
    </Page>
  ),
};
