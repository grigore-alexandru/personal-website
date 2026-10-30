// Resolve hook for the trip scripts and tests (`node --test`, Node 24 runs TypeScript natively):
// extensionless relative imports ("./schema" → "./schema.ts"), as the bundler does. Resolve only —
// no load hook, so CommonJS packages such as sharp load normally.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
