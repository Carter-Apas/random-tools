import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  AppHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  NativeSelect,
  Textarea,
  Toggle,
} from "../index";

const meta = { title: "Patterns/Application shell" } satisfies Meta;
export default meta;

type Story = StoryObj;

const ShellExample = () => {
  const [checked, setChecked] = useState(true);
  return (
    <div className="mono-app-content">
      <AppHeader title="Mermaid workspace" />
      <Card>
        <CardHeader>
          <CardTitle>Native form controls</CardTitle>
          <CardDescription>Primitives for apps with existing field layouts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="catalog-stack">
            <label>
              Comparison name
              <Input defaultValue="Daily commute" />
            </label>
            <label>
              Period
              <NativeSelect>
                <option>Annual</option>
                <option>Monthly</option>
              </NativeSelect>
            </label>
            <label>
              Notes
              <Textarea placeholder="Add a note" />
            </label>
            <Toggle aria-label="Remember inputs" checked={checked} onCheckedChange={setChecked} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Application: Story = { render: () => <ShellExample /> };
