declare module 'eslint-plugin-react-hooks' {
  import type { ESLint, Linter } from 'eslint';

  const plugin: {
    configs: {
      recommended: {
        rules: Linter.RulesRecord;
      };
    };
    rules: ESLint.Plugin['rules'];
  };

  export default plugin;
}
