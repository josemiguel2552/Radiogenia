import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: ["node_modules/**", ".next/**", "design-system/**", "public/**", "meta-ads/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Pragmatic baseline for a codebase adopting ESLint late: keep the
      // correctness rules as errors, relax the noisy stylistic ones.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      "prefer-const": "warn",
      "import/no-anonymous-default-export": "off",
      // React-Compiler-era rules: they flag long-established intentional
      // patterns here (localStorage hydration in effects, ref mirrors,
      // window.location redirects). Keep visible as warnings, not blockers.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/component-hook-factories": "warn",
      // Prose copy (marketing/admin) legitimately contains quotes.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
