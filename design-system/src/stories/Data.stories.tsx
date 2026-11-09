import type { Meta, StoryObj } from "@storybook/react-vite";

import { CostCalculator, Page, Section } from "./catalog";

import { Badge, Panel, Stat } from "../components/primitives";

const meta = { title: "Components/Data display" } satisfies Meta;
export default meta;
type Story = StoryObj;
export const ValuesAndTables: Story = {
  render: () => (
    <Page
      title="Make comparison easy."
      description="Tabular figures, explicit units, and right-aligned table values. Data stays legible without becoming decoration."
    >
      <Section title="Summary values">
        <Panel>
          <div className="demo-panel-content demo-stat-grid">
            <Stat label="Annual running cost" value="$1,714" detail="Energy + road user charges" />
            <Stat label="Cost per kilometre" value="$0.12" detail="Based on 14,000 km per year" />
          </div>
        </Panel>
      </Section>
      <Section title="Comparison table">
        <Panel>
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <caption>Annual vehicle costs / NZD</caption>
              <thead>
                <tr>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Powertrain</th>
                  <th scope="col">Consumption</th>
                  <th scope="col">Annual cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Daily commute</td>
                  <td>
                    <Badge tone="accent">Electric</Badge>
                  </td>
                  <td className="mono-code">16.5 kWh / 100 km</td>
                  <td className="mono-code">$1,714</td>
                </tr>
                <tr>
                  <td>Weekend wagon</td>
                  <td>
                    <Badge>Petrol</Badge>
                  </td>
                  <td className="mono-code">7.0 L / 100 km</td>
                  <td className="mono-code">$2,695</td>
                </tr>
                <tr>
                  <td>City runabout</td>
                  <td>
                    <Badge>Hybrid</Badge>
                  </td>
                  <td className="mono-code">4.5 L / 100 km</td>
                  <td className="mono-code">$1,733</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </Section>
      <Section title="Calculated values">
        <CostCalculator />
      </Section>
    </Page>
  ),
};
