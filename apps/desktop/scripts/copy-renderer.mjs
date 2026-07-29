import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// electron-builder packages files from within this project directory only - copying the
// Studio build in here (rather than referencing apps/studio/dist via a `../` glob) keeps
// the build config to plain in-package relative paths, which is the well-supported case.
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const studioDist = path.resolve(desktopRoot, '..', 'studio', 'dist');
const rendererDir = path.join(desktopRoot, 'renderer');

if (!fs.existsSync(studioDist)) {
  throw new Error(
    `apps/studio has not been built - expected ${studioDist}. Run "npm run build --workspace=@exotic/studio" first.`,
  );
}

fs.rmSync(rendererDir, { recursive: true, force: true });
fs.cpSync(studioDist, rendererDir, { recursive: true });
console.log(`Copied Studio build into ${rendererDir}`);
