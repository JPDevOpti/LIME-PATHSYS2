module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'react/jsx-props-no-spreading': 'off',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefers: 'type-imports' }],
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['.next/', 'dist/', 'node_modules/']
};
