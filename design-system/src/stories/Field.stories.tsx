import type { Meta, StoryObj } from "@storybook/react-vite";

import { Example, Page, Section } from "./catalog";

import { Field, Select } from "../components/primitives";

const meta = {
  title: "Components/Fields",
  component: Field,
  tags: ["autodocs"],
  args: {
    label: "Annual distance",
    placeholder: "14000",
    suffix: "km",
    hint: "An estimate is fine.",
    disabled: false,
  },
  decorators: [
    (Story, context) =>
      context.name === "Playground" ? (
        <div className="preview-stage preview-stage--small">
          <Story />
        </div>
      ) : (
        <Story />
      ),
  ],
} satisfies Meta<typeof Field>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const States: Story = {
  render: () => (
    <Page
      title="A little guidance."
      description="Visible labels, units where they belong, and feedback next to the field. Native controls preserve keyboard and mobile behaviour."
    >
      <Section title="Input states">
        <div className="catalog-grid-two">
          <Example title="Default">
            <Field
              label="Annual contribution"
              defaultValue="12000"
              suffix="NZD"
              hint="Total contributions over one year."
            />
          </Example>
          <Example title="Empty">
            <Field
              label="Comparison name"
              placeholder="e.g. Daily commute"
              hint="Choose a name you will recognise later."
            />
          </Example>
          <Example title="Invalid">
            <Field
              label="Annual distance"
              defaultValue="-500"
              error="Enter a distance of zero or more."
              type="number"
              min="0"
              suffix="km"
            />
          </Example>
          <Example title="Disabled">
            <Field
              label="Exchange rate"
              defaultValue="1.65"
              disabled
              hint="Available when using another currency."
            />
          </Example>
        </div>
      </Section>
      <Section title="Selection">
        <Example title="Native select">
          <Select
            label="Contribution frequency"
            defaultValue="monthly"
            hint="How often you add to your portfolio."
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </Example>
      </Section>
    </Page>
  ),
};
