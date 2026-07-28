
import json, os, platform, secrets, shutil, socket, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

ROOT=Path(__file__).resolve().parent
WEB=ROOT/"web"; DATA=ROOT/"data"; DATA.mkdir(exist_ok=True)
CFG=DATA/"config.json"; LOG=DATA/"portal.log"
PROJECT=Path(r"C:\Projects\Exotic"); SOURCE=PROJECT/"Exotic"/"EXOTIC-Native"; BUILD=PROJECT/"out"/"build"
if CFG.exists(): cfg=json.loads(CFG.read_text())
else:
    cfg={"token":secrets.token_urlsafe(18),"port":8765}
    CFG.write_text(json.dumps(cfg,indent=2))
state={"desktop":"online","project":"EXOTIC","task":"Portal ready","build":{"status":"idle","progress":0},"ai":"ready"}
proc=None

def write_log(s):
    line=f"[{time.strftime('%H:%M:%S')}] {s}"
    print(line)
    with LOG.open("a",encoding="utf-8") as f:f.write(line+"\n")

def ip():
    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
    try:s.connect(("8.8.8.8",80));return s.getsockname()[0]
    except:return "127.0.0.1"
    finally:s.close()

def safe(rel):
    base=PROJECT.resolve(); p=(base/unquote(rel)).resolve()
    p.relative_to(base); return p

# Paths writes must never touch: VCS internals, CI/CD definitions, deploy secrets,
# dependency trees, and the portal's own auth token. Kept narrow on purpose so the
# phone file editor still works for ordinary project files.
WRITE_DENY_PREFIXES=(".git",".github","node_modules",".env","PORTAL/data")

def writable(rel):
    p=safe(rel)
    relparts=p.relative_to(PROJECT).parts
    for deny in WRITE_DENY_PREFIXES:
        denyparts=Path(deny).parts
        if relparts[:len(denyparts)]==denyparts:
            return None
    return p

def cmd(action):
    exe=BUILD/"Release"/"EXOTIC.exe"
    return {
      "configure":["cmake","-S",str(SOURCE),"-B",str(BUILD),"-A","x64"],
      "build":["cmake","--build",str(BUILD),"--config","Release"],
      "clean-build":["powershell","-NoProfile","-Command",f"if(Test-Path '{BUILD}'){{Remove-Item '{BUILD}' -Recurse -Force}}; cmake -S '{SOURCE}' -B '{BUILD}' -A x64; if($LASTEXITCODE -eq 0){{cmake --build '{BUILD}' --config Release}}"],
      "run":["powershell","-NoProfile","-Command",f"Start-Process '{exe}'"],
      "open-source":["powershell","-NoProfile","-Command",f"Start-Process code -ArgumentList '{SOURCE}'"],
      "open-build":["explorer.exe",str(BUILD/"Release")]
    }[action]

def run_action(action):
    global proc
    c=cmd(action)
    if action in ("run","open-source","open-build"):
        subprocess.Popen(c,cwd=PROJECT); write_log(f"Launched {action}"); return
    if proc and proc.poll() is None: raise RuntimeError("Build already running")
    def worker():
        global proc
        state["task"]=action; state["build"]={"status":"running","progress":5}
        write_log(" ".join(map(str,c)))
        proc=subprocess.Popen(c,cwd=PROJECT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding="utf-8",errors="replace")
        n=0
        for line in proc.stdout:
            if line.strip(): write_log(line.rstrip())
            n+=1; state["build"]["progress"]=min(90,10+n//2)
        code=proc.wait()
        state["build"]={"status":"success" if code==0 else "failed","progress":100}
        state["task"]="Build complete" if code==0 else "Build failed"
        write_log(f"Exit code {code}"); proc=None
    threading.Thread(target=worker,daemon=True).start()

class H(BaseHTTPRequestHandler):
    def auth(self):
        # Header is preferred (doesn't land in browser history/autocomplete); the query
        # string is only kept alive for the one-time bootstrap link printed at startup.
        supplied=self.headers.get("X-EXOTIC-Token") or parse_qs(urlparse(self.path).query).get("token",[""])[0]
        return secrets.compare_digest(supplied,cfg["token"])
    def sendj(self,x,code=200):
        b=json.dumps(x).encode();self.send_response(code);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
    def static(self,p):
        if p=="/":p="/index.html"
        f=(WEB/p.lstrip("/")).resolve()
        if not f.exists():self.send_error(404);return
        mime={".html":"text/html",".css":"text/css",".js":"application/javascript",".png":"image/png",".json":"application/json"}.get(f.suffix,"application/octet-stream")
        b=f.read_bytes();self.send_response(200);self.send_header("Content-Type",mime);self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):
        u=urlparse(self.path)
        if u.path.startswith("/api/"):
            if not self.auth():self.sendj({"error":"Unauthorized"},401);return
            if u.path=="/api/status":
                t,u1,f=shutil.disk_usage(PROJECT.anchor or "/")
                self.sendj({"state":state,"system":{"host":platform.node(),"free_gb":round(f/1024**3,1),"time":time.strftime("%H:%M:%S")}});return
            if u.path=="/api/logs":
                lines=LOG.read_text(encoding="utf-8",errors="replace").splitlines()[-120:] if LOG.exists() else []
                self.sendj({"lines":lines});return
            if u.path=="/api/files":
                rel=parse_qs(u.query).get("path",[""])[0]
                try:
                    p=safe(rel)
                    if p.is_file():
                        self.sendj({"type":"file","name":p.name,"path":rel,"content":p.read_text(encoding="utf-8",errors="replace")[:100000]});return
                    items=[{"name":c.name,"path":str(c.relative_to(PROJECT)).replace("\\","/"),"type":"directory" if c.is_dir() else "file"} for c in sorted(p.iterdir(),key=lambda x:(x.is_file(),x.name.lower()))[:300]]
                    self.sendj({"type":"directory","path":rel,"items":items});return
                except Exception as e:self.sendj({"error":str(e)},400);return
            self.sendj({"error":"Not found"},404);return
        self.static(u.path)
    def do_POST(self):
        u=urlparse(self.path)
        if not self.auth():self.sendj({"error":"Unauthorized"},401);return
        n=int(self.headers.get("Content-Length","0")); data=json.loads(self.rfile.read(n) or b"{}")
        if u.path=="/api/action":
            try:run_action(data["action"]);self.sendj({"ok":True})
            except Exception as e:self.sendj({"error":str(e)},400)
        elif u.path=="/api/file":
            try:
                p=writable(data["path"])
                if p is None:self.sendj({"error":"Path is not editable via the portal"},403);return
                if p.exists():shutil.copy2(p,p.with_suffix(p.suffix+".portal-backup"))
                p.write_text(data["content"],encoding="utf-8"); self.sendj({"ok":True})
            except Exception as e:self.sendj({"error":str(e)},400)
        else:self.sendj({"error":"Not found"},404)
    def log_message(self,*a):pass

url=f"http://{ip()}:{cfg['port']}/?token={cfg['token']}"
print("\nEXOTIC PORTAL\nPhone URL:",url,"\nKeep this window open.\n")
write_log("Portal started")
ThreadingHTTPServer(("0.0.0.0",cfg["port"]),H).serve_forever()
