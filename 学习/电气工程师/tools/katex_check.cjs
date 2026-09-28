// stdin: JSON [[tex, display, where], ...] → stdout: JSON [{where, tex, msg}] for spans KaTeX cannot parse
const katex = require('../assets/katex/katex.min.js');
const items = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const bad = [];
for (const [tex, display, where] of items) {
  try {
    katex.renderToString(tex, { displayMode: !!display, throwOnError: true, strict: 'ignore', trust: false });
  } catch (e) {
    bad.push({ where, tex: tex.slice(0, 160), msg: String(e.message).slice(0, 160) });
  }
}
process.stdout.write(JSON.stringify(bad));
