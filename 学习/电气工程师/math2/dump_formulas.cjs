// 在沙箱里执行 formula-data.js，把 window.FORMULA_CARDS 以 JSON 输出到 stdout
const vm = require('vm');
const src = require('fs').readFileSync(process.argv[2], 'utf8');
const ctx = { window: {}, String };
vm.runInNewContext(src, ctx, { timeout: 10000 });
process.stdout.write(JSON.stringify(ctx.window.FORMULA_CARDS));
