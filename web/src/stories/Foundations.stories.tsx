import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta: Meta = { title: "Foundations/Tokens", parameters: { layout: "fullscreen" } };
export default meta;

const scales = {
  Brand: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((s) => `brand-${s}`),
  Accent: ["50", "100", "500", "600", "700", "800"].map((s) => `accent-${s}`),
  Neutral: ["0", "25", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((s) => `neutral-${s}`),
  Status: ["success-50", "success-600", "success-700", "warning-50", "warning-600", "warning-700", "danger-50", "danger-600", "danger-700", "info-50", "info-600", "info-700"],
};
const TYPE = ["6xl", "5xl", "4xl", "3xl", "2xl", "xl", "lg", "base", "sm", "xs"];
const SPACE = [1, 2, 3, 4, 6, 8, 12, 16];

export const Tokens: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-10 p-8">
      <section>
        <h2 className="text-3xl text-primary">Color</h2>
        {Object.entries(scales).map(([group, list]) => (
          <div key={group} className="mt-4">
            <h3 className="font-sans text-sm font-semibold text-text-muted uppercase">{group}</h3>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
              {list.map((t) => (
                <div key={t} className="overflow-hidden rounded-md border border-border bg-surface text-xs">
                  <div className="h-12" style={{ background: `var(--color-${t})` }} />
                  <p className="px-2 py-1 font-semibold">{t}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-3xl text-primary">Type</h2>
        <p className="mt-1 text-text-muted">Display: Big Shoulders Display 800. Body: Public Sans (variable). Both self-hosted.</p>
        <div className="mt-4 flex flex-col gap-2">
          {TYPE.map((t) => (
            <div key={t} className="flex items-baseline gap-4">
              <code className="w-14 shrink-0 text-xs text-text-muted">{t}</code>
              <span style={{ fontSize: `var(--text-${t})`, lineHeight: `var(--text-${t}--line-height)` }} className={["6xl", "5xl", "4xl", "3xl", "2xl"].includes(t) ? "font-display" : ""}>
                Cold beer and fresh deli
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-3xl text-primary">Spacing (4/8 grid)</h2>
        <div className="mt-4 flex flex-col gap-2">
          {SPACE.map((n) => <div key={n} className="flex items-center gap-3 text-sm"><code className="w-20">{n * 4}px</code><span className="h-4 rounded-sm bg-brand-300" style={{ width: n * 4 }} /></div>)}
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-3">
        <div><h2 className="text-3xl text-primary">Radius</h2>
          <div className="mt-4 flex gap-3">{["sm", "md", "lg", "xl"].map((r) => <div key={r} className="grid size-16 place-items-center border-2 border-brand-400 bg-brand-50 text-xs" style={{ borderRadius: `var(--radius-${r})` }}>{r}</div>)}</div></div>
        <div><h2 className="text-3xl text-primary">Shadow</h2>
          <div className="mt-4 flex gap-4">{["sm", "md", "lg"].map((s) => <div key={s} className="grid size-16 place-items-center rounded-lg bg-surface text-xs" style={{ boxShadow: `var(--shadow-${s})` }}>{s}</div>)}</div></div>
        <div><h2 className="text-3xl text-primary">Motion</h2>
          <ul className="mt-4 text-sm"><li>fast 120ms · hover, press</li><li>base 200ms · menus, fades</li><li>slow 320ms · drawers, sheets</li><li>All motion stops under “reduce motion”.</li></ul></div>
      </section>
      <section>
        <h2 className="text-3xl text-primary">Layers</h2>
        <p className="mt-2 text-sm text-text-muted">dropdown 20 · sticky header 30 · overlay 40 · drawer 50 · modal 60 · toast 70</p>
      </section>
    </div>
  ),
};
