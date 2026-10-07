import { defineConfig } from "oxfmt";

// Mirrors pi's biome formatter settings (https://github.com/earendil-works/pi/blob/main/biome.json).
// Like pi, only TypeScript is formatted; skills and docs are copied from upstream authors as-is.
export default defineConfig({
	useTabs: true,
	tabWidth: 3,
	printWidth: 120,
	semi: true,
	singleQuote: false,
	trailingComma: "all",
	arrowParens: "always",
	bracketSpacing: true,
	sortPackageJson: false,
	ignorePatterns: ["archive/**", "**/*.{md,json,jsonc,yaml,yml,html,css}"],
});
