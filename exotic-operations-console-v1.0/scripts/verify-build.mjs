import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const required = ['index.html','app.js','demo-data.js','styles.css','er-logo.svg'];
for (const file of required) {
  const p = path.join(root,file);
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) throw new Error(`Missing or empty: ${p}`);
}
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
for (const surface of ['Operations','Board','Ecosystem','Roadmap','Evidence','Bridge','Settings','BOARD OF DIRECTORS','EXOTIC ECOSYSTEM MAP','Execution Activity','Auto Mode','Systems Mind','Readable mind','INSPECTOR','BUILD HEALTH','PRODUCTION FABRIC']) {
  if (!app.includes(surface)) throw new Error(`Surface missing: ${surface}`);
}
const styles = fs.readFileSync(path.join(root,'styles.css'),'utf8');
for (const contract of ['.app-shell','.icon-rail','.explorer','.workspace','.inspector','.statusbar','.production-fabric','prefers-reduced-motion']) {
  if (!styles.includes(contract)) throw new Error(`Layout contract missing: ${contract}`);
}
console.log('EXOTIC Operations Console verification: PASS');
