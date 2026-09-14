/** Restores the descendant combinator that tw-animate-css@1.4.0 strips when minifying. */
const BROKEN_LTR = /\[dir="ltr"\]\*/g;
const BROKEN_RTL = /\[dir="rtl"\]\*/g;

function fixTwAnimateDir() {
  return {
    postcssPlugin: 'fix-tw-animate-dir',
    OnceExit(root) {
      root.walkRules((rule) => {
        const next = rule.selector
          .replace(BROKEN_LTR, '[dir="ltr"] *')
          .replace(BROKEN_RTL, '[dir="rtl"] *');
        if (next !== rule.selector) {
          rule.selector = next;
        }
      });
    },
  };
}

fixTwAnimateDir.postcss = true;

module.exports = fixTwAnimateDir;
