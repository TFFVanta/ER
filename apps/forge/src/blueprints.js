// Real, named package scaffolds - generalizes what createPackage() in index.js used to do as a
// single hardcoded template into multiple, chosen-by-name blueprints, each modeled on a real,
// battle-tested package already in this repo rather than invented fresh.

function jsonFile(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function basicPackage(name) {
  return [
    { path: 'README.md', content: `# @exotic/${name}\n\nEverything Is Exotic.\n` },
    {
      path: 'package.json',
      content: jsonFile({
        name: `@exotic/${name}`,
        version: '0.1.0',
        type: 'module',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: { build: 'tsc -p tsconfig.json', test: 'vitest run' },
      }),
    },
    {
      path: 'tsconfig.json',
      content: jsonFile({
        extends: '../../tsconfig.base.json',
        compilerOptions: { rootDir: 'src', outDir: 'dist' },
        include: ['src/**/*.ts'],
      }),
    },
    {
      path: 'src/index.ts',
      content: `export const identity = {\n  name: "@exotic/${name}",\n  tagline: "Everything Is Exotic."\n};\n`,
    },
    {
      path: 'tests/smoke.test.ts',
      content: [
        'import { describe, expect, it } from "vitest";',
        'import fs from "node:fs";',
        'import path from "node:path";',
        '',
        `describe("${name} package smoke", () => {`,
        '  it("has a valid Exotic package manifest", () => {',
        '    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));',
        `    expect(pkg.name).toBe("@exotic/${name}");`,
        '  });',
        '});',
        '',
      ].join('\n'),
    },
  ];
}

// Modeled on @exotic/company-engine: multiple focused, independently-tested modules barreled
// through index.ts, instead of basicPackage's single stub file - demonstrates the "one concern
// per file, tested independently" pattern this repo actually follows for real service packages.
function serviceModule(name) {
  const exampleModuleName = 'example';
  return [
    ...basicPackage(name).filter((file) => file.path !== 'src/index.ts' && file.path !== 'tests/smoke.test.ts'),
    {
      path: 'package.json',
      content: jsonFile({
        name: `@exotic/${name}`,
        version: '0.1.0',
        type: 'module',
        description: '',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: { build: 'tsc -p tsconfig.json', test: 'vitest run' },
      }),
    },
    {
      path: `src/${exampleModuleName}.ts`,
      content: [
        '// Replace this with a real focused module (one concern, e.g. ops.ts / finance.ts in',
        '// @exotic/company-engine) - keep each concern in its own file, barrel-exported below.',
        'export function exampleFunction(input: string): string {',
        '  return input.trim();',
        '}',
        '',
      ].join('\n'),
    },
    {
      path: 'src/index.ts',
      content: [
        `export { exampleFunction } from "./${exampleModuleName}.js";`,
        '',
        'export const identity = {',
        `  name: "@exotic/${name}",`,
        '  tagline: "Everything Is Exotic."',
        '};',
        '',
      ].join('\n'),
    },
    {
      path: `tests/${exampleModuleName}.test.ts`,
      content: [
        'import { describe, expect, it } from "vitest";',
        `import { exampleFunction } from "../src/${exampleModuleName}.js";`,
        '',
        `describe("exampleFunction", () => {`,
        '  it("trims whitespace", () => {',
        '    expect(exampleFunction("  hi  ")).toBe("hi");',
        '  });',
        '});',
        '',
      ].join('\n'),
    },
    {
      path: 'tests/smoke.test.ts',
      content: [
        'import { describe, expect, it } from "vitest";',
        'import fs from "node:fs";',
        'import path from "node:path";',
        '',
        `describe("${name} package smoke", () => {`,
        '  it("has a valid Exotic package manifest", () => {',
        '    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));',
        `    expect(pkg.name).toBe("@exotic/${name}");`,
        '  });',
        '});',
        '',
      ].join('\n'),
    },
  ];
}

// Modeled on @exotic/ui-remedy's real (post-DRY-fix) structure: esbuild+tsc build via the
// shared tooling/build-component-kit.mjs, a base styles.css with design tokens, the
// PropsWithoutTitle helper, and a templates/ dir type-checked against the built public API.
function componentKit(name) {
  return [
    {
      path: 'README.md',
      content: `# @exotic/${name}\n\nA React component kit. See packages/ui-remedy/README.md for the pattern this was scaffolded from.\n`,
    },
    {
      path: 'package.json',
      content: jsonFile({
        name: `@exotic/${name}`,
        version: '0.1.0',
        type: 'module',
        description: '',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        style: 'dist/index.css',
        exports: {
          '.': { types: './dist/index.d.ts', import: './dist/index.js' },
          './styles.css': './dist/index.css',
        },
        scripts: { build: 'node scripts/build.mjs', test: 'vitest run' },
        peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
        devDependencies: { esbuild: '^0.28.1' },
      }),
    },
    {
      path: 'tsconfig.json',
      content: jsonFile({
        extends: '../../tsconfig.base.json',
        compilerOptions: { rootDir: 'src', outDir: 'dist', jsx: 'react-jsx', types: ['node', 'react'] },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
      }),
    },
    {
      path: 'tsconfig.templates.json',
      content: jsonFile({
        extends: '../../tsconfig.base.json',
        compilerOptions: { jsx: 'react-jsx', types: ['node', 'react'], noEmit: true },
        include: ['src/**/*.ts', 'src/**/*.tsx', 'templates/**/*.tsx'],
      }),
    },
    {
      path: 'scripts/build.mjs',
      content: [
        'import path from "node:path";',
        'import { fileURLToPath } from "node:url";',
        'import { buildComponentKit } from "../../../tooling/build-component-kit.mjs";',
        '',
        'const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
        `await buildComponentKit(pkgRoot, "@exotic/${name}");`,
        '',
      ].join('\n'),
    },
    {
      path: 'src/css.d.ts',
      content: 'declare module "*.css";\n',
    },
    {
      path: 'src/prop-types.ts',
      content: [
        'import type { HTMLAttributes } from "react";',
        '',
        '// Every component with a `title` prop typed as ReactNode collides with the native HTML',
        '// `title` attribute (a plain-string tooltip) that HTMLAttributes already declares.',
        'export type PropsWithoutTitle<T extends HTMLAttributes<Element>> = Omit<T, "title">;',
        '',
      ].join('\n'),
    },
    {
      path: 'src/styles.css',
      content: [
        `/* @exotic/${name} design tokens - replace these placeholder values with real brand tokens. */`,
        ':root {',
        '  --kit-ink: #000000;',
        '  --kit-paper: #ffffff;',
        '  --kit-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
        '  font-family: var(--kit-font);',
        '}',
        '',
      ].join('\n'),
    },
    {
      path: 'src/components/Example.tsx',
      content: [
        'import type { HTMLAttributes, ReactNode } from "react";',
        '',
        'export interface ExampleProps extends HTMLAttributes<HTMLDivElement> {',
        '  children: ReactNode;',
        '}',
        '',
        '// Replace with real components. Keep the className/CSS pattern used across this repo\'s',
        '// other kits: one base class per component, defined in src/styles.css.',
        'export function Example({ className, children, ...rest }: ExampleProps) {',
        `  return (`,
        `    <div className={\`kit-example\${className ? \` \${className}\` : ""}\`} {...rest}>`,
        '      {children}',
        '    </div>',
        '  );',
        '}',
        '',
      ].join('\n'),
    },
    {
      path: 'src/index.ts',
      content: [
        'import "./styles.css";',
        '',
        'export { Example } from "./components/Example.js";',
        'export type { ExampleProps } from "./components/Example.js";',
        '',
        'export const identity = {',
        `  name: "@exotic/${name}",`,
        '  tagline: "Everything Is Exotic."',
        '};',
        '',
      ].join('\n'),
    },
    {
      path: 'tests/smoke.test.ts',
      content: [
        'import { describe, expect, it } from "vitest";',
        'import fs from "node:fs";',
        'import path from "node:path";',
        'import { createElement } from "react";',
        'import { renderToStaticMarkup } from "react-dom/server";',
        'import { Example } from "../src/index.js";',
        '',
        `describe("${name} package smoke", () => {`,
        '  it("has a valid Exotic package manifest", () => {',
        '    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));',
        `    expect(pkg.name).toBe("@exotic/${name}");`,
        '  });',
        '',
        '  it("renders real, non-empty markup", () => {',
        '    const html = renderToStaticMarkup(createElement(Example, {}, "content"));',
        '    expect(html).toContain("kit-example");',
        '  });',
        '});',
        '',
      ].join('\n'),
    },
  ];
}

export const blueprints = {
  'basic-package': { describe: 'A minimal TypeScript package (tsc build, one stub module).', files: basicPackage },
  'service-module': {
    describe: 'A multi-file service package: focused modules barrel-exported through index.ts, each independently tested. Modeled on @exotic/company-engine.',
    files: serviceModule,
  },
  'component-kit': {
    describe: 'A React component kit: esbuild+tsc build, design tokens, templates/ type-checked against the built API. Modeled on @exotic/ui-remedy.',
    files: componentKit,
  },
};

export function listBlueprints() {
  return Object.entries(blueprints).map(([name, def]) => ({ name, describe: def.describe }));
}

export function blueprintFiles(blueprintName, packageName) {
  const blueprint = blueprints[blueprintName];
  if (!blueprint) {
    throw new Error(`Unknown blueprint: ${blueprintName}. Run "exo blueprint list" to see available blueprints.`);
  }
  return blueprint.files(packageName);
}
