import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Plus, Trash2 } from "lucide-react";

import { Example, Page, Section } from "./catalog";

import { Button } from "../components/primitives";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Save comparison",
    variant: "primary",
    size: "md",
    disabled: false,
    loading: false,
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
    onClick: { action: "clicked" },
  },
  decorators: [
    (Story, context) =>
      context.name === "Playground" ? (
        <div className="preview-stage">
          <Story />
        </div>
      ) : (
        <Story />
      ),
  ],
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const AllStates: Story = {
  render: () => (
    <Page
      title="The familiar highlight."
      description="Blue selection, neutral text, and a fine accent frame. Drawn from your WezTerm tabs and Rofi launcher, with the softer corners used across your desktop."
    >
      <Section title="Variants">
        <Example title="Priority">
          <div className="catalog-row">
            <Button variant="primary">
              <Plus size={14} /> New comparison
            </Button>
            <Button>
              <Download size={14} /> Export
            </Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </Example>
      </Section>
      <Section title="States">
        <Example title="Available, busy, and unavailable">
          <div className="catalog-row">
            <Button variant="primary">Calculate costs</Button>
            <Button variant="primary" loading>
              Calculating
            </Button>
            <Button variant="primary" disabled>
              Calculate costs
            </Button>
          </div>
          <div className="catalog-row">
            <Button size="sm">Compact action</Button>
            <Button>Default action</Button>
            <Button aria-label="Add comparison">
              <Plus size={15} />
            </Button>
          </div>
        </Example>
      </Section>
      <p className="catalog-note">
        Mirage uses your desktop's #274364 selection with an amber frame. Light uses the launcher's
        #d3e1f5 selection with darker text and an amber frame. Hover reinforces the frame without
        changing the button's size. Icon-only actions need an accessible label.
      </p>
    </Page>
  ),
};
