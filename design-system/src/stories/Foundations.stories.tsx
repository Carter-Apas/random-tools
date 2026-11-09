import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyToken, Page, Section, ThemeCards } from "./catalog";

import { Badge, Panel } from "../components/primitives";

const meta = { title: "Foundations/Design tokens" } satisfies Meta;
export default meta;
type Story = StoryObj;
const colours = [
  ["Canvas", "--mono-bg"],
  ["Surface", "--mono-surface"],
  ["Raised", "--mono-raised"],
  ["Inset", "--mono-inset"],
  ["Text", "--mono-text"],
  ["Secondary text", "--mono-muted"],
  ["Border", "--mono-border"],
  ["Control border", "--mono-control-border"],
  ["Accent", "--mono-accent"],
  ["Accent text", "--mono-accent-text"],
  ["Selection", "--mono-selection"],
  ["Selection frame", "--mono-selection-border"],
  ["Success", "--mono-success"],
  ["Danger", "--mono-danger"],
];
export const Palette: Story = {
  render: () => (
    <Page
      title="Colour, with restraint."
      description="The surfaces and selection colours from your desktop themes, with fine amber frames in every appearance. Light pairs the launcher's pale blue selection with darker, higher-contrast text."
    >
      <Section title="Semantic palette" description="Use roles, rather than raw hex values.">
        <div className="catalog-swatch-grid">
          {colours.map(([label, token]) => (
            <div key={token} className="catalog-swatch">
              <div className="catalog-swatch-colour" style={{ background: `var(${token})` }} />
              <div>
                <h3>{label}</h3>
                <CopyToken token={token} />
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Appearance">
        <ThemeCards />
        <p className="catalog-note">
          Mirage and Light follow your desktop-theme palettes, WezTerm tabs, and Rofi launcher. They
          share their foundations with{" "}
          <a href="https://github.com/ayu-theme/ayu-colors" target="_blank" rel="noreferrer">
            Ayu's colour palette
          </a>
          . Secondary text, control borders, and focus colours are adjusted for interface contrast.
          Dark extends the same selection language onto a deeper surface.
        </p>
      </Section>
    </Page>
  ),
};
export const Typography: Story = {
  name: "Typography",
  render: () => (
    <Page
      title="Type that gets out of the way."
      description="The sans-serif interface of your desktop, with monospace reserved for numbers and code. SF Pro Text or Inter is used when installed; bundled Geist provides the fallback."
    >
      <Section title="The two voices">
        <div className="catalog-grid-two">
          <Panel className="catalog-type-specimen">
            <p>
              Clear thinking.
              <br />
              Clear interfaces.
            </p>
            <span>Desktop sans / Interface, headings, and prose</span>
          </Panel>
          <Panel className="catalog-type-specimen">
            <p className="mono-code">
              $12,480.00
              <br />
              16.5 kWh
            </p>
            <span>Geist Mono / Numbers, units, and code</span>
          </Panel>
        </div>
      </Section>
      <Section title="Type scale">
        <div className="catalog-type-scale">
          {[
            { name: "Display / 52", size: 52, text: "One language." },
            { name: "Page / 36", size: 36, text: "Your tools" },
            { name: "Section / 24", size: 24, text: "Plan a little further" },
            { name: "Heading / 17", size: 17, text: "Annual running costs" },
            { name: "Body / 14", size: 14, text: "Compare the things that matter." },
            { name: "Label / 12", size: 12, text: "Annual distance" },
            { name: "Metadata / 11", size: 11, text: "Last calculated just now" },
          ].map(({ name, size, text }) => (
            <div key={name}>
              <span className="mono-code">{name}</span>
              <p style={{ fontSize: size, letterSpacing: size >= 24 ? "-.045em" : undefined }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
};
export const SpaceAndShape: Story = {
  render: () => (
    <Page
      title="Space is structure."
      description="A four-pixel spacing unit, a compact control height, and three corner radii. Consistency should be felt before it is noticed."
    >
      <Section title="Spacing scale">
        <div className="catalog-spacing">
          {[4, 8, 12, 16, 24, 32, 48].map((space) => (
            <div key={space}>
              <i style={{ height: space }} />
              <span className="mono-code">{space}px</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Shape">
        <div className="catalog-grid-two">
          {[
            { title: "Controls / 6px", radius: 6 },
            { title: "Surfaces / 10px", radius: 10 },
          ].map(({ title, radius }) => (
            <Panel key={title} style={{ padding: 32, borderRadius: radius }}>
              <Badge>{title}</Badge>
              <p className="catalog-note">
                The same 6px controls and 10px surfaces used in your Rofi launcher and desktop
                panels.
              </p>
            </Panel>
          ))}
        </div>
      </Section>
      <Section title="Layout rules">
        <div className="catalog-rules">
          <div>
            <h3>Content first</h3>
            <p>
              Left-align labels, values, and prose. Keep the main content within 1,152px. Use a
              single column on small screens.
            </p>
          </div>
          <div>
            <h3>Group by task</h3>
            <p>
              Use a surface when controls belong to one task. Separate related rows with spacing.
              Reserve borders for boundaries people need to see.
            </p>
          </div>
          <div>
            <h3>Motion answers actions</h3>
            <p>
              Use a short 120ms transition for state changes. Avoid entrance animations. Honour
              reduced-motion preferences.
            </p>
          </div>
          <div>
            <h3>Make focus visible</h3>
            <p>
              A 2px amber outline with a 4px offset makes keyboard position clear. Native inputs,
              switches, and dialogs preserve familiar interaction.
            </p>
          </div>
        </div>
      </Section>
    </Page>
  ),
};
export const Adoption: Story = {
  render: () => (
    <Page
      title="A foundation to share."
      description="The CSS tokens work in any app. The React components add consistent behaviour. This package stays independent of the existing tools until the design is approved."
    >
      <Section title="React">
        <pre className="catalog-code-block mono-code">{`import { ThemeProvider, Button, Field } from '@random-tools/mono';\nimport '@random-tools/mono/styles.css';\n\n<ThemeProvider defaultTheme="mirage">\n  <Field label="Annual distance" suffix="km" type="number" />\n  <Button variant="primary">Calculate costs</Button>\n</ThemeProvider>`}</pre>
      </Section>
      <Section title="Plain HTML / CSS">
        <pre className="catalog-code-block mono-code">{`/* Framework-independent, font-free semantic tokens */\n@import '@random-tools/mono/tokens.css';\n\n<div data-mono-theme="light">\n  <!-- Apply the tokens to your existing markup. -->\n</div>\n\n.tool {\n  background: var(--mono-bg);\n  color: var(--mono-text);\n  border: 1px solid var(--mono-border);\n}`}</pre>
        <p className="catalog-note">
          Run npm run build:lib to produce the JavaScript, types, fonts, and stylesheet. The package
          is private for now; a later rollout can use a packed local dependency or a registry
          package. Each existing tool keeps its independent build context.
        </p>
      </Section>
    </Page>
  ),
};
