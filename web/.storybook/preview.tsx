import type { Preview } from "@storybook/nextjs-vite";
import "@fontsource-variable/public-sans";
import "@fontsource/big-shoulders-display/800";
import "../src/styles/globals.css";

/* The app loads fonts through next/font (src/app/fonts.ts). Storybook loads the same
   files from @fontsource and points the same CSS variables at them. */
const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    a11y: { test: "error" },
    backgrounds: { options: { page: { name: "Page", value: "#f9fafc" }, card: { name: "Card", value: "#ffffff" } } },
  },
  initialGlobals: { backgrounds: { value: "page" } },
  decorators: [
    (Story) => (
      <>
        {/* Theme tokens read these on :root, as next/font sets them on <html> in the app. */}
        <style>{`:root{--font-sans-face:'Public Sans Variable';--font-display-face:'Big Shoulders Display'}`}</style>
        <Story />
      </>
    ),
  ],
};
export default preview;
