import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["src/test/**/*.ts", "src/test/**/*.d.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Allow any in test files since we're mocking external modules
      "@typescript-eslint/no-explicit-any": "off",
      // Allow namespace for jest-extended type declarations
      "@typescript-eslint/no-namespace": "off",
      // Allow declare module syntax in .d.ts files
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];
