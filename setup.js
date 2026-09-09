const fs = require('fs');
const path = require('path');

const root = 'd:/Kai';

const dirs = [
  'apps/desktop/src',
  'apps/service/src',
  'apps/installer/src',
  'packages/planner/src',
  'packages/execution-engine/src',
  'packages/tool-engine/src',
  'packages/windows-engine/src',
  'packages/browser-engine/src',
  'packages/vision-engine/src',
  'packages/voice-engine/src',
  'packages/memory-engine/src',
  'packages/permissions/src',
  'packages/coding-engine/src',
  'packages/mail-engine/src',
  'packages/shared/src',
  'packages/plugin-sdk/src',
  'docs',
  'tests',
  'scripts',
  '.github/workflows',
  '.husky'
];

dirs.forEach(d => fs.mkdirSync(path.join(root, d), { recursive: true }));

const writeJson = (file, data) => fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2));
const writeFile = (file, data) => fs.writeFileSync(path.join(root, file), data);

// 1. Root package.json
writeJson('package.json', {
  name: "kai-monorepo",
  private: true,
  scripts: {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "prepare": "husky install"
  },
  devDependencies: {
    "turbo": "latest",
    "typescript": "latest",
    "prettier": "latest",
    "eslint": "latest",
    "husky": "latest",
    "vitest": "latest",
    "@playwright/test": "latest",
    "@types/node": "latest",
    "@typescript-eslint/parser": "latest",
    "@typescript-eslint/eslint-plugin": "latest"
  }
});

// 2. pnpm-workspace.yaml
writeFile('pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n  - 'packages/*'\n");

// 3. turbo.json
writeJson('turbo.json', {
  $schema: "https://turbo.build/schema.json",
  pipeline: {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {},
    "lint": {},
    "typecheck": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
});

// 4. Base TS Configs
writeJson('tsconfig.base.json', {
  compilerOptions: {
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true
  }
});

const packageNames = [
  'planner', 'execution-engine', 'tool-engine', 'windows-engine', 
  'browser-engine', 'vision-engine', 'voice-engine', 'memory-engine', 
  'permissions', 'coding-engine', 'mail-engine', 'shared', 'plugin-sdk'
];

const appNames = ['desktop', 'service', 'installer'];

let tsRefs = [];

// 5. Setup Packages
packageNames.forEach(pkg => {
  const dir = `packages/${pkg}`;
  writeJson(`${dir}/package.json`, {
    name: `@kai/${pkg}`,
    version: "0.0.1",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      "build": "tsc -b",
      "lint": "eslint \"src/**/*.ts\"",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    dependencies: pkg !== 'shared' ? { "@kai/shared": "workspace:*" } : {}
  });

  const tsconfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      composite: true,
      outDir: "dist",
      rootDir: "src",
      module: "CommonJS",
      target: "ES2022"
    },
    include: ["src"]
  };
  
  if (pkg !== 'shared') {
    tsconfig.references = [{ path: "../shared" }];
  }

  writeJson(`${dir}/tsconfig.json`, tsconfig);
  writeFile(`${dir}/src/index.ts`, `export const name = '@kai/${pkg}';\n`);
  tsRefs.push({ path: `./${dir}` });
});

// 6. Setup Apps
appNames.forEach(app => {
  const dir = `apps/${app}`;
  writeJson(`${dir}/package.json`, {
    name: `@kai/${app}`,
    version: "0.0.1",
    scripts: {
      "build": "tsc -b",
      "lint": "eslint \"src/**/*.ts\"",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    },
    dependencies: {
      "@kai/shared": "workspace:*"
    }
  });

  writeJson(`${dir}/tsconfig.json`, {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      composite: true,
      outDir: "dist",
      rootDir: "src",
      module: "CommonJS",
      target: "ES2022"
    },
    include: ["src"],
    references: [{ path: "../../packages/shared" }]
  });

  writeFile(`${dir}/src/index.ts`, `console.log('App: @kai/${app}');\n`);
  tsRefs.push({ path: `./${dir}` });
});

// 7. Root tsconfig.json (Project References)
writeJson('tsconfig.json', {
  files: [],
  references: tsRefs
});

// 8. ESLint / Prettier
writeJson('.prettierrc', {
  semi: true,
  singleQuote: true,
  trailingComma: "es5"
});

writeJson('.eslintrc.json', {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  env: {
    node: true,
    es6: true
  }
});

// 9. CI Workflow
writeFile('.github/workflows/ci.yml', `name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: pnpm run build
`);

console.log('Scaffolding complete!');
