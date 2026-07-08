const fs = require('fs');
const code = fs.readFileSync('E:/앱/Bell-operation/src/app/(dashboard)/page.tsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
lines.forEach((l, i) => {
  const open = (l.match(/<div/g) || []).length;
  const close = (l.match(/<\/div>/g) || []).length;
  depth += (open - close);
  if (i >= 239 && i <= 340) {
    console.log(`${String(i+1).padStart(3, '0')}: depth=${String(depth).padStart(2, ' ')} | ${l.trim()}`);
  }
});
