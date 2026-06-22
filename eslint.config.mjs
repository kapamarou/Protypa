import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The React Compiler rules (eslint-plugin-react-hooks v6) are newly strict
      // and this pre-React-Compiler codebase predates them. Surface as warnings —
      // visible, not blocking CI — and clean them up as a separate, tracked pass
      // rather than risk behaviour changes right before launch.
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // Cosmetic only (raw quotes render fine); not worth blocking CI.
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
