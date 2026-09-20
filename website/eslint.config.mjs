import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**', 'out/**', 'build/**', 'next-env.d.ts',
    // Generated engine copies. They are checked by the parity tests against the QML
    // sources in the repository root, not by hand-lint rules.
    'app/competitionEngine.js', 'app/learningEngine.js', 'app/contentEngine.js', 'app/practiceModel.js',
  ]),
]);

export default eslintConfig;
