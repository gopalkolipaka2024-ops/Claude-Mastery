# Adams Shore web (Next.js)

Browse-only store site. Architecture: [`../adr/0001-architecture.md`](../adr/0001-architecture.md).
Status: **Phase 1 (design system)**. Pages come in Phase 2.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run tokens:check` | Checks every text/background token pair against WCAG 2.2 AA |
| `npm run storybook` | Component library at http://localhost:6006 |
| `npm run build-storybook && npm run test:a11y` | Builds Storybook and runs axe on every story (fails on any violation or broken story) |

## Where things live

- `src/styles/tokens.css` — all design tokens (color, type, spacing, radius, shadow, motion, layers). Tailwind utilities are generated from it.
- `src/app/fonts.ts` + `src/app/fonts/` — the two self-hosted typefaces (SIL Open Font License).
- `src/config/store.ts` — store facts. Missing details are `null` and marked `TODO(owner)`; never guessed.
- `src/config/stock.ts` — stock badge thresholds (the only place to change them).
- `src/components/` — the component library. `src/stories/` — one story per component state.

Story prices and stock levels are examples for documenting states. The live site only shows prices and stock from the store's own data.
