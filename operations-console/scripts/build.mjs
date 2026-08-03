import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptRoot, '..');
const sourceRoot = path.join(projectRoot, 'src');
const publicRoot = path.join(projectRoot, 'public');
const outputRoot = path.join(projectRoot, 'dist');
const sourceFiles = ['index.html', 'app.js', 'demo-data.js', 'styles.css'];
const publicFiles = ['er-logo-reference.png', 'er-logo.png', 'er-logo.svg'];

fs.mkdirSync(outputRoot, { recursive: true });
for (const filename of sourceFiles) {
  fs.copyFileSync(path.join(sourceRoot, filename), path.join(outputRoot, filename));
}
for (const filename of publicFiles) {
  fs.copyFileSync(path.join(publicRoot, filename), path.join(outputRoot, filename));
}

console.log(`EXOTIC Operations Workspace built: ${outputRoot}`);
