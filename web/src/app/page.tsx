import Link from "next/link";

/* Placeholder until Phase 2 builds the real home page. The component library lives in Storybook. */
export default function Home() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-4">
      <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Design system preview</p>
      <h1 className="text-5xl text-primary">Adams Shore Super Market &amp; Liquors</h1>
      <p className="text-lg text-text-muted">The new site is being built. Components and design tokens are documented in Storybook (<code>npm run storybook</code>).</p>
      <Link href="tel:+16174726455" className="w-fit font-semibold text-primary underline">Call (617) 472-6455</Link>
    </main>
  );
}
