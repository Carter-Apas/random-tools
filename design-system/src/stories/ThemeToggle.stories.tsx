import type { Meta, StoryObj } from "@storybook/react-vite";

import { Example, Page } from "./catalog";

import { AppHeader, AppThemeProvider, Panel, ThemeToggle } from "../index";

const meta = { title: "Components/Theme toggle", component: ThemeToggle } satisfies Meta<
  typeof ThemeToggle
>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Cycle: Story = {
  render: () => (
    <Page
      title="Day, dusk, night."
      description="One icon button cycles Light, Mirage, and Dark. The glyph rotates and settles into its next shape; reduced motion keeps the change still."
    >
      <Example title="Theme control" note="Sun · dusk · moon">
        <ThemeToggle />
      </Example>
    </Page>
  ),
};

export const SystemDefault: Story = {
  render: () => (
    <AppThemeProvider>
      <div className="mono-app-content">
        <AppHeader title="Theme preview" />
        <Panel>
          <h1>Your system, by default.</h1>
          <p>
            Without a saved choice, Light and Dark follow your device. Choose a theme to remember it
            across visits and tabs. Mirage remains available in the three-theme cycle.
          </p>
        </Panel>
      </div>
    </AppThemeProvider>
  ),
};
