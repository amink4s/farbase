const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

for (const f of files) {
  const p = path.join(dir, f);
  console.log('---', f);
  console.log(fs.readFileSync(p, 'utf8'));
}
