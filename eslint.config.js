import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "dist-e2e/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "node_modules/**",
    ],
  },
  ...ts.configs.recommended,
);
