import cp from 'node:child_process';

const raw = process.argv.slice(2).join(' ');
const msg = (raw && raw.trim()) ? raw.trim() : 'chore: checkpoint';

function clean(text) {
  return text.replace(/"/g, '').trim() || 'chore: checkpoint';
}

function run(cmd) {
  cp.execSync(cmd, { stdio: 'inherit' });
}

run('npm run build');
run('git add -A');

const changed = cp.execSync('git status --porcelain').toString().trim();

if (changed) {
  run('git commit -m "' + clean(msg) + '"');
} else {
  console.log('✓ Nothing to commit');
}

run('git status');
