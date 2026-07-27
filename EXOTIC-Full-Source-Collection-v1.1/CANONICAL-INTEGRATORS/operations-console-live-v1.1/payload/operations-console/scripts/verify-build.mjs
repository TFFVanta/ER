import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const required = ['index.html','app.js','demo-data.js','styles.css','er-logo.svg'];
for (const file of required) {
  const p = path.join(root,file);
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) throw new Error(`Missing or empty: ${p}`);
}
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
for (const page of ['Overview','Objectives','Proposals','Approvals','Scheduler','Agents','Resources','Operations','Audit Timeline','Traces','Alerts','System Health','Settings','Emergency Controls']) {
  if (!app.includes(page)) throw new Error(`Page missing: ${page}`);
}
console.log('EXOTIC Operations Console verification: PASS');
