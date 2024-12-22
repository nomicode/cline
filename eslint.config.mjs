import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // This actually turns off all Prettier rules
];

// We disable all Prettier rules so that Trunk can handle autoformatting
// for us instead of seeing ESLint errors for minor formatting issue
// cf. https://docs.trunk.io/code-quality/linters/supported/eslint
