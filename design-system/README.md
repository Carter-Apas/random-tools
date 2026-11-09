# Mono

A shared interface language for Random Tools: minimal, clean, technical, and
inspired by Ayu. This folder is an independent Storybook and a reusable component
package. All six applications consume versioned snapshots of this package.

## Preview

Use Node 22.13+ (22.x) or Node 24+.

```sh
cd design-system
npm ci
npm run dev
```

Open [Storybook](http://localhost:6006/?path=/story/start-here-overview--design-language).
The **Overview** is the visual starting point. Its icon button cycles **Light**,
**Mirage**, and **Dark**; the Storybook toolbar can select a theme directly.
The initial theme follows your system light/dark setting. Theme
selection is reflected in the Storybook URL, so a particular appearance can be
bookmarked or shared.

- **Foundations:** colour roles, type, spacing, shape, and adoption examples.
- **Components:** buttons, fields, selection, navigation, feedback, dialogs, and data.
- **Patterns:** interactive calculator, checklist, planner, quiz, and tool directory.
- **Playground** stories expose component props through Storybook Controls.
- **Docs** pages document the button, field, and checkbox APIs.

## Design language

Mirage and Light follow the user's dotfiles: `desktop-theme/palettes/dark.sh`
and `light.sh`, `.wezterm.lua`, and Rofi's `config.rasi`. Their foundation is
[Ayu's palette](https://github.com/ayu-theme/ayu-colors).

Highlighted actions use a blue selection background, neutral text, and a fine
amber frame. Mirage uses `#274364` with amber `#ffcc66`; Light uses `#d3e1f5`
with a deeper amber `#a66d16` and dark `#28323d` text for stronger contrast.
Dark extends that treatment to a deeper surface. Hover
reinforces the frame without changing control dimensions.

The desktop's sans-serif typography carries through controls and prose: SF Pro
Text or Inter when installed, with bundled Geist as the fallback. Geist Mono is
reserved for numbers, units, and code. Secondary text, control borders, and
focus colours are adjusted for interface contrast. Status accents are paired
with explicit text and icons. These palettes are copied into the package;
there is no runtime dependency on the dotfiles.

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
npm run lint          # @cartercree/eslint-config v4 with ESLint 10
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

## Using the library

Build the library before consuming it. The package exports:

| Import                          | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `@random-tools/mono`            | React components, ThemeProvider, useTheme, and types     |
| `@random-tools/mono/styles.css` | Full component stylesheet and bundled fonts              |
| `@random-tools/mono/tokens.css` | Font-free tokens for any framework                       |
| `@random-tools/mono/browser`    | Plain browser header, appearance, and checkbox behaviour |

```tsx
import { Button, Field, ThemeProvider } from "@random-tools/mono";
import "@random-tools/mono/styles.css";

<ThemeProvider defaultTheme="mirage">
  <Field label="Annual distance" type="number" suffix="km" />
  <Button variant="primary">Calculate costs</Button>
</ThemeProvider>;
```

The package stays private. Each app carries a versioned `vendor/random-tools-mono-*.tgz`
archive plus its own manifest and lockfile. Its Docker build needs only that app's
folder. Updating this source does not rebuild or silently change every application.

After changing the library, increment its version, then package it for selected apps:

```sh
npm version patch --no-git-tag-version
npm run package:apps -- car-cost-comparison fishing-checklist
```

Use `npm run package:apps -- --all` for an intentional full rollout. The command
builds the library, copies the archive, updates each selected dependency, removes
its previous archive, and refreshes its lockfile. Validate the affected apps and
review their changes before committing. Restart running app dev servers after an
upgrade so their dependency cache reloads; use Vite’s `--force` if needed.
Commit their archives and lockfiles with
the source change; installs and Docker builds never regenerate the snapshots.

React apps use `AppThemeProvider`, `AppHeader`, and the exported form, card,
feedback, and selection primitives. `AppHeader` displays a C mark and an icon-only
`ThemeToggle`; omit `description` for a header without a subtitle.

`AppThemeProvider` follows `prefers-color-scheme` (Light or Dark) until a user
chooses a theme. It keeps following live system changes without writing a
preference on first visit. Clicking `ThemeToggle` cycles Light → Mirage → Dark,
persists `mono.appearance`, and synchronizes that choice between same-origin tabs.
Existing saved choices are respected. Removing that key and reloading restores
system defaults. Clearing it in another tab immediately restores the system
setting in listening tabs. The standalone `ThemeProvider` defaults to the system theme at
mount; use `AppThemeProvider` for persistence and live system synchronization.

`ThemeToggle` uses sun, dusk, and moon glyphs with a rotating crossfade, a tooltip,
an accessible action label, and native keyboard interaction. Reduced motion
removes the transition. It is available in **Components / Theme toggle**, including
an interactive system-default application preview. `AppearancePicker` remains
an alias for compatibility.

Plain JavaScript apps import `initMono` from `@random-tools/mono/browser` and
use the matching `.mono-*` component classes. A header with
`data-mono-app-header` and `data-title` receives the shared C mark and icon theme
control with the same system-default, storage, and animation behaviour. Checkboxes opt into completion feedback with `.mono-checkbox` and
`data-mono-animated`. The browser module is self-contained and has no React dependency or sibling JavaScript chunks. The two static
apps copy the built stylesheet and browser module into public assets during
`npm run build`, `predev`, and `prestart`; those generated files are ignored.

Native primitives include `Input`, `NativeSelect`, `Textarea`, `Toggle`, and the
`Card` family for existing field layouts. See **Patterns / Application shell**
for an example. Keep domain-specific calculations and editor behaviour in each app.

The React and browser APIs share CSS and tokens. Fonts and icons are bundled in
the library build, so apps have no runtime font-service requests. Source comment
conventions, formatting, and per-app quality checks are documented in the root README.

Cross-app browser checks are opt-in: after installing all apps and building
`quiz-gen` and `mermaid`, run `npm run test:apps` here. They use ports 6101–6106,
an isolated Mermaid data directory under `/tmp`, and a placeholder quiz API key;
quiz generation is covered by mocked unit tests, not external API calls.

Examples use local React state and illustrative data. They do not call app
backends, persist comparisons, or replace the existing tools' business logic.
