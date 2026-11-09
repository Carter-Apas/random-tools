import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChecklistDemo, Example, Page, PreferencesDemo, Section } from "./catalog";

import { Checkbox, Switch } from "../components/primitives";

const meta = {
  title: "Components/Selection",
  component: Checkbox,
  tags: ["autodocs"],
  args: {
    label: "Life jacket",
    description: "A must-have for every trip.",
    defaultChecked: false,
    disabled: false,
    animated: false,
  },
  decorators: [
    (Story, context) =>
      ["Playground", "Animated"].includes(context.name) ? (
        <div className="preview-stage preview-stage--small">
          <Story />
        </div>
      ) : (
        <Story />
      ),
  ],
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Animated: Story = {
  args: { animated: true, description: "Check to play the optional completion animation." },
};
export const CheckboxesAndSwitches: Story = {
  render: () => (
    <Page
      title="Small choices, clear states."
      description="Checkboxes track selections. Switches turn preferences on or off. Every control has a visible label and supports the keyboard."
    >
      <Section title="Checkbox states">
        <Example title="Selectable items">
          <div className="catalog-stack">
            <Checkbox label="Rod & reel" />
            <Checkbox label="Fishing licence" defaultChecked />
            <Checkbox
              label="Boat equipment"
              description="Available when planning a boat trip."
              disabled
            />
          </div>
        </Example>
      </Section>
      <Section title="Optional completion animation">
        <Example title="Fishing checklist feedback" note="animated / opt in">
          <div className="catalog-stack">
            <Checkbox
              label="Pack the life jacket"
              description="A pop, tick drawing, and small burst when checked."
              animated
            />
            <Checkbox
              label="Already packed"
              description="Initial checked values stay still."
              animated
              defaultChecked
            />
          </div>
          <p className="catalog-note">
            Enable with animated. The effect plays on selection, stays quiet when unchecked, and
            respects reduced motion.
          </p>
        </Example>
      </Section>
      <Section title="Switch states">
        <Example title="Immediate preferences">
          <div className="catalog-stack">
            <Switch
              label="Remember inputs"
              description="Keep values between visits"
              defaultChecked
            />
            <Switch label="Sound effects" />
            <Switch label="Shared preferences" description="Coming in a later version" disabled />
          </div>
        </Example>
      </Section>
      <Section title="In context">
        <div className="catalog-grid-two">
          <ChecklistDemo />
          <PreferencesDemo />
        </div>
      </Section>
    </Page>
  ),
};
