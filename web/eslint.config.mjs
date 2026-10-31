import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Package drawings and optimized photos are plain <img> on purpose (see ProductGrid, Photo)
      "@next/next/no-img-element": "off",
      // A leading underscore marks a value that is deliberately unused
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-nocheck": "allow-with-description" }],
    },
  },
  {
    // Playwright fixtures call a function named `use`; it isn't the React hook
    files: ["e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts", "storybook-static/**", "playwright-report/**", "test-results/**", ".lighthouseci/**", "cloudflare-env.d.ts"]),
]);
