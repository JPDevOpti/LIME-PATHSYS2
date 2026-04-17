import js from "@eslint/js";
import nextConfig from "eslint-config-next";

export default [
  js.configs.recommended,
  ...nextConfig,
  {
    rules: {
      "react/jsx-props-no-spreading": "off",
      "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [".next/**", "dist/**", "node_modules/**"],
  },
];
