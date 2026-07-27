import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(base, 'dist');
const source = fs.readFileSync(path.join(dist, 'demo-data.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
let data = structuredClone(context.window.demoData);
data.summary.lastSync = new Date().toISOString();
const port = Number(process.env.PORT || 8787);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon' };

function json(res, code, value) {
  res.writeHead(code, { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}

const server = http.createServer((req,res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (req.method === 'OPTIONS') return json(res, 200, {});
  if (url.pathname === '/api/v1/health') return json(res, 200, { ok:true, runtime:'EXOTIC Continuous Operations', version:'1.0.0', mode:'mock-live' });
  if (url.pathname === '/api/v1/console/snapshot') {
    data.summary.lastSync = new Date().toISOString();
    return json(res, 200, data);
  }
  if (url.pathname.startsWith('/api/v1/actions/') && req.method === 'POST') {
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>json(res,200,{ok:true,message:`Mock runtime accepted ${url.pathname.split('/').pop()}`,payload:body?JSON.parse(body):{}})); return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = path.resolve(dist, rel);
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(error,content)=>{ if(error){res.writeHead(404);return res.end('Not found');} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content); });
});
server.listen(port,'127.0.0.1',()=>console.log(`EXOTIC live demo: http://127.0.0.1:${port}`));
