module.exports = function fixSwitchPolyfillLoader(source) {
  return source
    .replace(
      /const sheetPromise\s*=\s*fetch\([\s\S]*?new CSSStyleSheet\(\)\.replace\(css\)\);/,
      "const sheetPromise = Promise.resolve(typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null);"
    )
    .replace(
      'if (!document.adoptedStyleSheets.includes(newSheet))',
      'if (newSheet && document.adoptedStyleSheets && !document.adoptedStyleSheets.includes(newSheet))'
    );
};

