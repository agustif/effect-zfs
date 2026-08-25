import { fixupPluginRules } from "@eslint/compat"
import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import _import from "eslint-plugin-import"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/vendor/**",
      "**/.generated-specs/**",
      "packages/effect-zfs/src/generated/**"
    ]
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ),
  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    plugins: {
      import: fixupPluginRules(_import),
      "sort-destructure-keys": sortDestructureKeys,
      "simple-import-sort": simpleImportSort
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module"
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx", ".mts", ".cts"]
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: [
            "packages/effect-zfs/tsconfig.json",
            "packages/effect-zfs/tsconfig.typetest.json"
          ]
        }
      }
    },
    rules: {
      "no-fallthrough": "off",
      "no-irregular-whitespace": "off",
      "object-shorthand": "error",
      "prefer-destructuring": "off",
      "sort-imports": "off",
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.property.name='push'] > SpreadElement.arguments",
        message: "Do not use spread arguments in Array.push"
      }],
      "no-unused-vars": "off",
      "prefer-rest-params": "off",
      "prefer-spread": "off",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": "off",
      "import/order": "off",
      "simple-import-sort/imports": "off",
      "sort-destructure-keys/sort-destructure-keys": "error",
      "@typescript-eslint/array-type": ["warn", {
        default: "generic",
        readonly: "generic"
      }],
      "@typescript-eslint/member-delimiter-style": 0,
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-interface": "off",
      // inline `type` only — separate-type-imports + dprint rewrote Schema.Class
      // value/type mixed imports into invalid TypeScript
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports"
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-array-constructor": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-namespace": "off"
    }
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        structuredClone: "readonly",
        Buffer: "readonly"
      }
    }
  }
]
