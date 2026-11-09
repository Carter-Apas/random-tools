# Mono

A shared interface language for Random Tools: minimal, clean, technical, and
inspired by Ayu. This folder is an independent Storybook and a reusable component
package. Existing applications have not been migrated.

## Preview

Use Node 22.12 or newer.

```sh
cd design-system
npm ci
npm run dev
```

Open [Storybook](http://localhost:6006/?path=/story/start-here-overview--design-language).
The **Overview** is the visual starting point. Use its appearance switcher or the
Storybook toolbar to choose **Dark**, **Mirage** (default), or **Light**. Theme
selection is reflected in the Storybook URL, so a particular appearance can be
bookmarked or shared.

- **Foundations:** colour roles, type, spacing, shape, and adoption examples.
- **Components:** buttons, fields, selection, navigation, feedback, dialogs, and data.
- **Patterns:** interactive calculator, checklist, planner, quiz, and tool directory.
- **Playground** stories expose component props through Storybook Controls.
- **Docs** pages document the button, field, and checkbox APIs.

## Design language

Surfaces take their cues from [Ayu's palette](https://github.com/ayu-theme/ayu-colors).
Geist handles interface text; Geist Mono handles numbers, units, and code. Amber
is reserved for the primary action, focus, and selected states. Small status
accents are paired with explicit text and icons. Text and interactive borders
are adjusted from the editor palette for interface contrast.

Spacing follows a four-pixel unit. Controls use 6px corners; larger surfaces use
10px corners. Layouts collapse to a single column on small screens. The system
supports visible focus, keyboard-operated tabs, native form controls, native
modal dialogs, and reduced motion.

Checkboxes accept an optional `animated` flag (off by default) for the fishing
checklist's pop, tick drawing, particle burst, and row highlight. It only plays
when the user checks an item, including with the keyboard. Initial checked values
stay still, and reduced-motion preferences disable the effect. Try it in
**Components / Selection / Animated**.

```tsx
<Checkbox label="Life jacket" animated />
```

## Source

```text
.storybook/              Storybook configuration, theme toolbar, manager styling
src/styles/tokens.css   Framework-independent semantic tokens for all themes
src/styles/             Shared typography and component styles
src/components/         Exported React primitives
src/theme.tsx           Scoped ThemeProvider and useTheme hook
src/stories/            Documentation and interactive design examples
tests/                  Browser interaction, accessibility, and rendering checks
```

The theme attribute is `data-mono-theme="dark|mirage|light"`. Tokens use a
`--mono-` prefix and components use `.mono-` classes to reduce collisions during
future adoption. Themes are scoped, so previews can show different themes
alongside each other. Fonts are bundled, without external font service requests.

## Validation

```sh
npm run lint          # @cartercree/eslint-config from Carter-Apas/eslint-config
npm run format:check  # Prettier
npm run typecheck
npm run build         # Static Storybook in storybook-static/
npm run build:lib     # Reusable ES module, stylesheet, and declarations in dist/
npx playwright install chromium
npm test              # Starts Storybook if it is not already running
```

Browser checks cover the three appearances, horizontal overflow down to 320px,
WCAG AA checks with axe on the overview, calculator updates, keyboard navigation,
checklist progress, switches, modal focus and saving, directory filtering, and
rendering every story. Automated accessibility checks complement manual review.

Preview the production Storybook with `npm run preview` after `npm run build`.

## Future adoption

Build the library before consuming it. The package exports:

| Import                          | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `@random-tools/mono`            | React components, ThemeProvider, useTheme, and types |
| `@random-tools/mono/styles.css` | Full component stylesheet and bundled fonts          |
| `@random-tools/mono/tokens.css` | Font-free tokens for any framework                   |

```tsx
import { Button, Field, ThemeProvider } from "@random-tools/mono";
import "@random-tools/mono/styles.css";

<ThemeProvider defaultTheme="mirage">
  <Field label="Annual distance" type="number" suffix="km" />
  <Button variant="primary">Calculate costs</Button>
</ThemeProvider>;
```

The package is private during design review. When ready to adopt it, use a
versioned package or packed dependency that each tool's independent Docker build
can access. A sibling `file:../design-system` dependency alone will not work in
the existing isolated Docker contexts. Plain JavaScript tools can adopt tokens
without converting to React.

Examples use local React state and illustrative data. They do not call app
backends, persist comparisons, or replace the existing tools' business logic.
