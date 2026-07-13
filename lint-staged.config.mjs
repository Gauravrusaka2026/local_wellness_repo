export default {
  '*.{cjs,js,mjs,ts,tsx}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  '*.{css,json,md,yaml,yml}': ['prettier --write'],
};
