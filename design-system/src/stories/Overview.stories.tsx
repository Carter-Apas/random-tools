import type { Meta, StoryObj } from "@storybook/react-vite";

import { Overview } from "./catalog";

const meta = { title: "Start here/Overview", component: Overview } satisfies Meta<typeof Overview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DesignLanguage: Story = {};
