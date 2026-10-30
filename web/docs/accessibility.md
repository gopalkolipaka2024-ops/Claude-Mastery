# Accessibility (WCAG 2.2 AA)

## What is checked automatically

Every pull request runs these in the **Web quality** workflow, and any failure blocks it.

| Check | Command | Covers |
| --- | --- | --- |
| axe on every Storybook story | `npm run build-storybook && npm run test:a11y` | All 76 component states, WCAG 2.2 AA + best practices |
| axe on every page type, desktop and phone | `npm run test:pages -- <url>` | Home, department, filtered aisle, search (3 kinds), product, store, contact, deals, legal, 404, age gate |
| Keyboard and interaction | `npm run test:keyboard -- <url>` | See below |
| Design-token contrast | `npm run tokens:check` | Every text/background pair at AA |
| Lighthouse accessibility ≥ 95 | `npm run lhci` | Home, Category, Search, Product |

`check-keyboard.mjs` verifies:
- **Skip link** is the first Tab stop, becomes visible, and moves focus into `<main>`.
- **Visible focus** on every Tab stop (the first 45 per page), never hidden under the sticky header (WCAG 2.4.7, 2.4.11).
- **Landmarks**: one header, one main, a footer, uniquely named navigation regions, `lang="en"`.
- **Dialogs** (mobile menu, filter sheet, age gate): focus moves in, Tab and Shift+Tab stay inside, the page behind is `inert`, Escape closes (except the age gate, which must be answered), and focus returns to the button that opened it.
- **Mega menu**: Enter opens, Tab goes from the button into its panel, Escape closes and returns focus.
- **Search**: ArrowDown highlights suggestions (`aria-activedescendant`), groups are named, Escape closes.
- **Forms**: on error, focus moves to a summary that lists each problem and links to the field. Each field gets `aria-invalid` and is described by its message. The form says all fields are required.
- **Tap targets of at least 44×44 px** on phones. Inline links inside sentences are exempt, as in WCAG 2.5.8.
- **Images**: every `<img>` has `alt` (empty for decorative package drawings next to the product name). SVG icons are hidden from screen readers or named.
- **Reflow**: no sideways scrolling at 320 px wide (WCAG 1.4.10).
- **Reduced motion**: no running animations when the device asks for less motion.

## Patterns to keep

- Use `Dialog` for anything modal. It handles focus, inert background, Escape and focus return.
- Use real `<button>` and `<a>`. Add ARIA only where HTML has no equivalent (combobox, listbox, `aria-expanded` on disclosure buttons).
- Interactive elements are at least `min-h-11` (44 px). Icon buttons use the `tap-target` utility.
- Never remove focus outlines. The global `:focus-visible` style is a 3 px ring that meets 3:1 contrast.

## Still to do by hand before launch

Automated tools catch roughly half of real-world issues. Before launch, test once with real
assistive technology:
- VoiceOver on iPhone (Safari) and on a Mac
- NVDA with Firefox or Chrome on Windows
- TalkBack on Android
- Windows high-contrast (forced colors) mode and browser text spacing overrides
