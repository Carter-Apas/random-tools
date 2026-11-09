import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Example, Page, Section, ToolDirectory } from "./catalog";

import { Tabs } from "../components/primitives";

const meta = { title: "Components/Navigation" } satisfies Meta;
export default meta;
type Story = StoryObj;
const TabExample = () => {
  const [tab, setTab] = useState("costs");
  return (
    <>
      <Tabs
        label="Comparison sections"
        items={[
          { value: "costs", label: "Running costs" },
          { value: "maintenance", label: "Maintenance", count: 3 },
          { value: "market", label: "Market prices" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <p
        className="catalog-note"
        role="tabpanel"
        aria-label={
          tab === "costs"
            ? "Running costs"
            : tab === "maintenance"
              ? "Maintenance"
              : "Market prices"
        }
      >
        {tab === "costs"
          ? "Energy, road user charges, and the cost per kilometre."
          : tab === "maintenance"
            ? "Tyres, servicing, and a little room for the unexpected."
            : "Compare your vehicle against current market listings."}
      </p>
    </>
  );
};
export const TabsAndDirectory: Story = {
  render: () => (
    <Page
      title="Find your way."
      description="A small navigation vocabulary: tabs within a task, search and filters across tools. Use Left, Right, Home, and End to move between tabs."
    >
      <Section title="Tabs">
        <Example title="Inside a comparison">
          <TabExample />
        </Example>
      </Section>
      <Section title="Search and filter">
        <ToolDirectory />
      </Section>
    </Page>
  ),
};
