#include "exotic/portal/portal_server.hpp"

#include <array>
#include <atomic>
#include <chrono>
#include <cstring>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string_view>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
using Socket = SOCKET;
static constexpr Socket invalid_socket = INVALID_SOCKET;
#else
#include <arpa/inet.h>
#include <netdb.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
using Socket = int;
static constexpr Socket invalid_socket = -1;
#endif

namespace exotic {
namespace {

#ifdef _WIN32
class SocketRuntime {
public:
    SocketRuntime() {
        WSADATA data{};
        if (WSAStartup(MAKEWORD(2, 2), &data) != 0) throw std::runtime_error("Portal: WSAStartup failed");
    }
    ~SocketRuntime() { WSACleanup(); }
};
void close_socket(Socket socket) { closesocket(socket); }
#else
class SocketRuntime {};
void close_socket(Socket socket) { close(socket); }
#endif

std::string make_token() {
    std::array<unsigned char, 24> bytes{};
    std::random_device random;
    for (auto& byte : bytes) byte = static_cast<unsigned char>(random());
    std::ostringstream out;
    out << std::hex << std::setfill('0');
    for (const auto byte : bytes) out << std::setw(2) << static_cast<unsigned int>(byte);
    return out.str();
}

std::string local_ipv4() {
    char hostname[256]{};
    if (gethostname(hostname, static_cast<int>(sizeof(hostname))) != 0) return "127.0.0.1";
    addrinfo hints{};
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    addrinfo* result = nullptr;
    if (getaddrinfo(hostname, nullptr, &hints, &result) != 0) return "127.0.0.1";
    std::string best = "127.0.0.1";
    for (auto* item = result; item != nullptr; item = item->ai_next) {
        const auto* address = reinterpret_cast<sockaddr_in*>(item->ai_addr);
        char text[INET_ADDRSTRLEN]{};
        if (inet_ntop(AF_INET, &address->sin_addr, text, sizeof(text)) == nullptr) continue;
        const std::string candidate = text;
        if (candidate.rfind("127.", 0) != 0) { best = candidate; break; }
    }
    freeaddrinfo(result);
    return best;
}

std::string json_escape(std::string_view input) {
    std::ostringstream out;
    for (const unsigned char character : input) {
        switch (character) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (character < 0x20) out << "?";
                else out << static_cast<char>(character);
        }
    }
    return out.str();
}

std::string url_decode(std::string_view input) {
    std::string result;
    result.reserve(input.size());
    for (std::size_t i = 0; i < input.size(); ++i) {
        if (input[i] == '%' && i + 2 < input.size()) {
            const auto hex = [](char c) -> int {
                if (c >= '0' && c <= '9') return c - '0';
                if (c >= 'a' && c <= 'f') return c - 'a' + 10;
                if (c >= 'A' && c <= 'F') return c - 'A' + 10;
                return -1;
            };
            const int high = hex(input[i + 1]);
            const int low = hex(input[i + 2]);
            if (high >= 0 && low >= 0) { result.push_back(static_cast<char>((high << 4) | low)); i += 2; continue; }
        }
        result.push_back(input[i] == '+' ? ' ' : input[i]);
    }
    return result;
}

std::string query_value(std::string_view target, std::string_view key) {
    const auto question = target.find('?');
    if (question == std::string_view::npos) return {};
    std::string_view query = target.substr(question + 1);
    while (!query.empty()) {
        const auto ampersand = query.find('&');
        const auto part = query.substr(0, ampersand);
        const auto equals = part.find('=');
        if (equals != std::string_view::npos && part.substr(0, equals) == key) return url_decode(part.substr(equals + 1));
        if (ampersand == std::string_view::npos) break;
        query.remove_prefix(ampersand + 1);
    }
    return {};
}

std::string path_only(std::string_view target) {
    const auto question = target.find('?');
    return std::string(target.substr(0, question));
}

std::string header_value(std::string_view request, std::string_view name) {
    const std::string needle = "\r\n" + std::string(name) + ":";
    const auto start = request.find(needle);
    if (start == std::string_view::npos) return {};
    auto value_start = start + needle.size();
    while (value_start < request.size() && request[value_start] == ' ') ++value_start;
    const auto end = request.find("\r\n", value_start);
    return std::string(request.substr(value_start, end - value_start));
}

bool send_all(Socket socket, std::string_view bytes) {
    std::size_t sent = 0;
    while (sent < bytes.size()) {
#ifdef _WIN32
        const int result = send(socket, bytes.data() + sent, static_cast<int>(bytes.size() - sent), 0);
#else
        const auto result = send(socket, bytes.data() + sent, bytes.size() - sent, 0);
#endif
        if (result <= 0) return false;
        sent += static_cast<std::size_t>(result);
    }
    return true;
}

void respond(Socket socket, int status, std::string_view status_text,
             std::string_view content_type, std::string_view body,
             std::string_view extra_headers = {}) {
    std::ostringstream response;
    response << "HTTP/1.1 " << status << ' ' << status_text << "\r\n"
             << "Content-Type: " << content_type << "\r\n"
             << "Content-Length: " << body.size() << "\r\n"
             << "Cache-Control: no-store\r\n"
             << "X-Content-Type-Options: nosniff\r\n"
             << "X-Frame-Options: DENY\r\n"
             << "Referrer-Policy: no-referrer\r\n"
             << extra_headers
             << "Connection: close\r\n\r\n" << body;
    send_all(socket, response.str());
}

constexpr std::string_view portal_html = R"PORTAL(<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#ffffff"><title>Exotic Portal</title>
<link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/styles.css"></head><body>
<header class="topbar"><div class="brand"><div class="mark"><i></i><i></i><i></i></div><div><strong>EXOTIC</strong><small>PORTAL</small></div></div><button id="refresh" class="square">↻</button></header>
<main>
<section id="home" class="view active">
  <article class="hero card"><div><p class="eyebrow">CONNECTED WORKSTATION</p><h1>Exotic Command Center</h1><p id="connectionText" class="muted">Checking secure connection…</p></div><div id="statusDot" class="dot"></div></article>
  <div class="metrics"><article class="metric card pink"><span>Runtime</span><strong id="runtime">—</strong></article><article class="metric card yellow"><span>Entities</span><strong id="entities">—</strong></article><article class="metric card blue"><span>Relations</span><strong id="relationships">—</strong></article><article class="metric card black"><span>Memories</span><strong id="memories">—</strong></article></div>
  <article class="card section"><p class="eyebrow">SAFE COMMANDS</p><h2>Runtime Control</h2><button id="demoButton" class="command"><b>▶</b><span><strong>Run intelligence loop</strong><small>Observe → Predict → Align → Act → Learn</small></span></button><button id="reindexButton" class="command"><b>⌁</b><span><strong>Reindex workspace</strong><small>Refresh approved project discovery</small></span></button></article>
  <article class="card section"><p class="eyebrow">RECENT ACTIVITY</p><h2>Audit Stream</h2><div id="activityList" class="activity"></div></article>
</section>
<section id="projects" class="view"><div class="title"><p class="eyebrow">WORKSPACE GRAPH</p><h1>Projects</h1></div><div id="projectList" class="project-list"></div></section>
<section id="files" class="view"><div class="title"><button id="fileBack" class="back">←</button><div><p class="eyebrow">PROJECT BROWSER</p><h1 id="fileTitle">Files</h1></div></div><div id="breadcrumbs" class="crumbs"></div><div id="fileList" class="file-list"></div><pre id="fileViewer" class="viewer hidden"></pre></section>
<section id="system" class="view"><div class="title"><p class="eyebrow">PLATFORM</p><h1>System</h1></div><article class="card section"><h2>Security boundary</h2><p>Portal exposes only token-authenticated, allowlisted actions. Arbitrary shell commands and paths outside the workspace are blocked.</p></article><article class="card section"><h2>Workspace root</h2><code id="workspaceRoot">—</code></article><article class="card section"><h2>Platform capabilities</h2><div class="chips"><span>Runtime</span><span>Projects</span><span>Files</span><span>Audit</span><span>PWA</span><span>LAN Pairing</span></div></article></section>
</main>
<nav><button data-view="home" class="active">◉<span>Home</span></button><button data-view="projects">▦<span>Projects</span></button><button data-view="system">⬡<span>System</span></button></nav>
<div id="toast" class="toast"></div><script src="/app.js"></script></body></html>)PORTAL";

constexpr std::string_view portal_css = R"CSS(:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;background:#f3f3ef;--pink:#ff4fa3;--yellow:#ffd84d;--blue:#4db8ff;--line:3px solid #111}*{box-sizing:border-box}body{margin:0;padding-bottom:88px;background:linear-gradient(#fff 0 180px,#f3f3ef 180px);min-height:100vh}button{font:inherit;color:inherit}.topbar{height:76px;background:#fff;border-bottom:var(--line);display:flex;align-items:center;justify-content:space-between;padding:12px 18px;position:sticky;top:0;z-index:10}.brand{display:flex;align-items:center;gap:11px}.brand strong{letter-spacing:.08em}.brand small{display:block;font-size:10px;letter-spacing:.25em}.mark{width:42px;height:42px;border:var(--line);border-radius:10px;overflow:hidden;display:grid;grid-template-columns:repeat(3,1fr)}.mark i:nth-child(1){background:var(--pink)}.mark i:nth-child(2){background:var(--yellow)}.mark i:nth-child(3){background:var(--blue)}.square{width:42px;height:42px;border:var(--line);border-radius:10px;background:#fff;box-shadow:3px 3px 0 #111;font-size:22px;font-weight:900}.square:active,.command:active,.project:active,.file-row:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #111}main{width:min(820px,100%);margin:auto;padding:18px}.view{display:none}.view.active{display:grid;gap:16px}.card{background:#fff;border:var(--line);border-radius:18px;box-shadow:5px 5px 0 #111}.hero{padding:22px;display:flex;align-items:center;justify-content:space-between}.hero h1,.title h1{margin:4px 0}.eyebrow{margin:0;font-size:10px;font-weight:900;letter-spacing:.17em}.muted{margin:5px 0 0;color:#666}.dot{width:25px;height:25px;border:3px solid #111;border-radius:50%;background:#aaa;box-shadow:0 0 0 6px #eee}.dot.online{background:#35d06f;box-shadow:0 0 0 6px #d9f8e4}.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.metric{min-height:94px;padding:14px;display:flex;flex-direction:column;justify-content:space-between}.metric span{font-size:11px;text-transform:uppercase;font-weight:900}.metric strong{font-size:24px}.metric.pink{border-top:8px solid var(--pink)}.metric.yellow{border-top:8px solid var(--yellow)}.metric.blue{border-top:8px solid var(--blue)}.metric.black{border-top:8px solid #111}.section{padding:18px}.section h2{margin:4px 0 14px}.command,.project,.file-row{width:100%;border:var(--line);background:#fff;border-radius:14px;padding:14px;text-align:left;box-shadow:3px 3px 0 #111;margin-top:10px}.command{display:flex;gap:12px;align-items:center}.command b{width:42px;height:42px;border:2px solid #111;border-radius:10px;display:grid;place-items:center;background:var(--pink)}.command:nth-of-type(2) b{background:var(--yellow)}.command span strong,.command span small{display:block}.command small{margin-top:3px}.activity{display:grid;gap:8px}.activity article{border:2px solid #111;border-radius:11px;padding:10px}.activity small{display:block;color:#666;margin-top:3px}.activity .bad{border-left:8px solid #e84a4a}.activity .good{border-left:8px solid #35d06f}.project-list,.file-list{display:grid;gap:11px}.project{display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center}.project .icon{width:48px;height:48px;border:2px solid #111;border-radius:12px;display:grid;place-items:center;background:var(--blue);font-weight:900}.project:nth-child(3n+2) .icon{background:var(--pink)}.project:nth-child(3n) .icon{background:var(--yellow)}.project strong,.project small{display:block}.project small{color:#555;margin-top:3px}.badges{display:flex;gap:4px}.badges i,.chips span{font-style:normal;font-size:10px;font-weight:900;border:2px solid #111;border-radius:999px;padding:4px 7px;background:#fff}.title{display:flex;align-items:center;gap:12px;padding:4px}.back{border:var(--line);background:#fff;border-radius:10px;width:42px;height:42px;font-weight:900}.crumbs{font-size:12px;font-weight:800;overflow:auto;white-space:nowrap}.file-row{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px}.file-row .kind{font-size:22px}.file-row small{color:#666}.viewer{margin:0;background:#111;color:#fff;border:var(--line);border-radius:14px;padding:15px;white-space:pre-wrap;overflow:auto;max-height:58vh;font-size:12px}.hidden{display:none}.chips{display:flex;flex-wrap:wrap;gap:8px}code{display:block;overflow:auto;border:2px solid #111;border-radius:10px;padding:12px;background:#f7f7f4}nav{position:fixed;left:0;right:0;bottom:0;height:76px;border-top:var(--line);background:#fff;display:grid;grid-template-columns:repeat(3,1fr);z-index:20;padding-bottom:env(safe-area-inset-bottom)}nav button{border:0;background:#fff;font-size:20px;display:grid;place-items:center;padding:7px}nav button span{font-size:10px;font-weight:900}nav button.active{background:#111;color:#fff}.toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%) translateY(20px);background:#111;color:#fff;padding:10px 14px;border-radius:999px;opacity:0;pointer-events:none;transition:.2s;z-index:30}.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}@media(min-width:700px){.metrics{grid-template-columns:repeat(4,1fr)}main{padding-top:28px}})CSS";

constexpr std::string_view portal_js = R"JS((()=>{const p=new URLSearchParams(location.search),s=p.get('token');if(s){localStorage.setItem('exoticPortalToken',s);history.replaceState({},'',location.pathname)}const token=localStorage.getItem('exoticPortalToken')||'',state={project:'',path:'',stack:[]},$=id=>document.getElementById(id);const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)};const api=async(path,o={})=>{const sep=path.includes('?')?'&':'?';const r=await fetch(`${path}${sep}token=${encodeURIComponent(token)}`,o);if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return r.json()};
function show(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='projects')loadProjects();if(id==='system')refresh()}document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.view));
async function refresh(){try{const d=await api('/api/status');$('statusDot').classList.add('online');$('connectionText').textContent='Secure local connection active';$('runtime').textContent=d.version;$('entities').textContent=d.entities;$('relationships').textContent=d.relationships;$('memories').textContent=d.memories;$('workspaceRoot').textContent=d.workspace;loadActivity()}catch(e){$('statusDot').classList.remove('online');$('connectionText').textContent=token?'Computer unavailable or token rejected':'Pairing token missing';toast(e.message)}}
async function loadActivity(){try{const d=await api('/api/activity');$('activityList').innerHTML=d.items.slice().reverse().map(x=>`<article class="${x.success?'good':'bad'}"><strong>${escapeHtml(x.category)}</strong> · ${escapeHtml(x.message)}<small>${new Date(x.timestamp).toLocaleString()}</small></article>`).join('')||'<p class="muted">No activity yet.</p>'}catch{}}
async function loadProjects(){const d=await api('/api/projects');$('projectList').innerHTML=d.projects.map(x=>`<button class="project" data-id="${x.id}"><span class="icon">${x.name.slice(0,1).toUpperCase()}</span><span><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.kind)}</small></span><span class="badges">${x.cmake?'<i>C++</i>':''}${x.node?'<i>NODE</i>':''}${x.git?'<i>GIT</i>':''}</span></button>`).join('')||'<p>No projects found.</p>';document.querySelectorAll('.project').forEach(b=>b.onclick=()=>openProject(b.dataset.id,b.querySelector('strong').textContent))}
function openProject(id,name){state.project=id;state.path='';state.stack=[];$('fileTitle').textContent=name;show('files');loadFiles()}
async function loadFiles(){const d=await api(`/api/files?project=${encodeURIComponent(state.project)}&path=${encodeURIComponent(state.path)}`);$('breadcrumbs').textContent=state.path||'/';$('fileViewer').classList.add('hidden');$('fileList').classList.remove('hidden');$('fileList').innerHTML=d.files.map(x=>`<button class="file-row" data-path="${encodeURIComponent(x.path)}" data-dir="${x.directory}"><span class="kind">${x.directory?'▣':'□'}</span><span><strong>${escapeHtml(x.name)}</strong><small>${x.directory?'Folder':formatSize(x.size)}</small></span><span>›</span></button>`).join('')||'<p>Empty folder.</p>';document.querySelectorAll('.file-row').forEach(b=>b.onclick=()=>b.dataset.dir==='true'?enter(decodeURIComponent(b.dataset.path)):openFile(decodeURIComponent(b.dataset.path)))}
function enter(path){state.stack.push(state.path);state.path=path;loadFiles()}async function openFile(path){const d=await api(`/api/file?project=${encodeURIComponent(state.project)}&path=${encodeURIComponent(path)}`);$('fileList').classList.add('hidden');$('fileViewer').classList.remove('hidden');$('fileViewer').textContent=d.content;$('breadcrumbs').textContent=path;state.stack.push(state.path);state.path=path+'::file'}
$('fileBack').onclick=()=>{if(state.path.endsWith('::file')){state.path=state.stack.pop()||'';loadFiles();return}if(state.stack.length){state.path=state.stack.pop();loadFiles()}else show('projects')};
$('demoButton').onclick=async()=>{try{toast('Running intelligence loop');const d=await api('/api/demo',{method:'POST'});toast(`Executed: ${d.executed}`);refresh()}catch(e){toast(e.message)}};$('reindexButton').onclick=async()=>{try{await api('/api/reindex',{method:'POST'});toast('Workspace reindexed');refresh()}catch(e){toast(e.message)}};$('refresh').onclick=refresh;
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function formatSize(n){if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});refresh();setInterval(refresh,7000)})();)JS";

constexpr std::string_view manifest_json = R"JSON({"name":"Exotic Portal","short_name":"Portal","start_url":"/","display":"standalone","background_color":"#ffffff","theme_color":"#ffffff","description":"Secure mobile command center for the Exotic Runtime","icons":[]})JSON";
constexpr std::string_view service_worker_js = R"SW(self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));)SW";

std::string iso_time(std::chrono::system_clock::time_point time) {
    const std::time_t value = std::chrono::system_clock::to_time_t(time);
    std::tm tm{};
#ifdef _WIN32
    gmtime_s(&tm, &value);
#else
    gmtime_r(&value, &tm);
#endif
    std::ostringstream out;
    out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

} // namespace

PortalServer::PortalServer(Runtime& runtime, PortalOptions options)
    : runtime_(runtime), options_(std::move(options)), platform_(options_.workspace_root), token_(make_token()) {
    platform_.record("portal", "Secure Portal session created");
}

PortalServer::~PortalServer() { stop(); }

std::string PortalServer::local_url() const {
    std::ostringstream out;
    out << "http://" << local_ipv4() << ':' << options_.port << "/?token=" << token_;
    return out.str();
}

void PortalServer::stop() noexcept {
    running_ = false;
    const auto socket = static_cast<Socket>(listen_socket_);
    if (socket != invalid_socket) {
        close_socket(socket);
        listen_socket_ = static_cast<std::intptr_t>(invalid_socket);
    }
}

int PortalServer::run() {
    [[maybe_unused]] SocketRuntime sockets;
    const Socket server = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server == invalid_socket) throw std::runtime_error("Portal: unable to create socket");
    listen_socket_ = static_cast<std::intptr_t>(server);
    int reuse = 1;
#ifdef _WIN32
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&reuse), sizeof(reuse));
#else
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
#endif
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_port = htons(options_.port);
    address.sin_addr.s_addr = htonl(options_.allow_remote ? INADDR_ANY : INADDR_LOOPBACK);
    if (bind(server, reinterpret_cast<sockaddr*>(&address), sizeof(address)) != 0) {
        close_socket(server); listen_socket_ = static_cast<std::intptr_t>(invalid_socket);
        throw std::runtime_error("Portal: port " + std::to_string(options_.port) + " is unavailable");
    }
    if (listen(server, 16) != 0) throw std::runtime_error("Portal: unable to listen");

    running_ = true;
    std::cout << "\nEXOTIC PORTAL 0.3\nLocal:  http://127.0.0.1:" << options_.port << "/?token=" << token_
              << "\nMobile: " << local_url() << "\nWorkspace: " << platform_.workspace_root().string()
              << "\n\nOpen the Mobile address on a phone connected to the same Wi-Fi.\nPress Ctrl+C to stop.\n\n" << std::flush;

    while (running_) {
        sockaddr_in client_address{};
#ifdef _WIN32
        int client_size = sizeof(client_address);
#else
        socklen_t client_size = sizeof(client_address);
#endif
        const Socket client = accept(server, reinterpret_cast<sockaddr*>(&client_address), &client_size);
        if (client == invalid_socket) { if (running_) std::cerr << "Portal: connection accept failed\n"; continue; }
        std::array<char, 32768> buffer{};
#ifdef _WIN32
        const int received = recv(client, buffer.data(), static_cast<int>(buffer.size() - 1), 0);
#else
        const auto received = recv(client, buffer.data(), buffer.size() - 1, 0);
#endif
        if (received <= 0) { close_socket(client); continue; }
        const std::string request(buffer.data(), static_cast<std::size_t>(received));
        const auto first_space = request.find(' ');
        const auto second_space = first_space == std::string::npos ? std::string::npos : request.find(' ', first_space + 1);
        if (first_space == std::string::npos || second_space == std::string::npos) {
            respond(client, 400, "Bad Request", "text/plain; charset=utf-8", "Malformed request"); close_socket(client); continue;
        }
        const std::string method = request.substr(0, first_space);
        const std::string target = request.substr(first_space + 1, second_space - first_space - 1);
        const std::string path = path_only(target);

        if (path == "/" && method == "GET") respond(client, 200, "OK", "text/html; charset=utf-8", portal_html, "Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'\r\n");
        else if (path == "/styles.css" && method == "GET") respond(client, 200, "OK", "text/css; charset=utf-8", portal_css);
        else if (path == "/app.js" && method == "GET") respond(client, 200, "OK", "application/javascript; charset=utf-8", portal_js);
        else if (path == "/manifest.webmanifest" && method == "GET") respond(client, 200, "OK", "application/manifest+json", manifest_json);
        else if (path == "/service-worker.js" && method == "GET") respond(client, 200, "OK", "application/javascript; charset=utf-8", service_worker_js);
        else if (path.rfind("/api/", 0) == 0) {
            std::string supplied_token = query_value(target, "token");
            if (supplied_token.empty()) supplied_token = header_value(request, "X-Exotic-Token");
            if (supplied_token != token_) {
                platform_.record("security", "Rejected request with invalid token", false);
                respond(client, 401, "Unauthorized", "application/json", "{\"error\":\"invalid pairing token\"}");
            } else if (path == "/api/status" && method == "GET") {
                const std::string status = runtime_.status();
                const auto find_count = [&](std::string_view key) {
                    const auto start = status.find(std::string(key) + "=");
                    if (start == std::string::npos) return std::string("0");
                    const auto value_start = start + key.size() + 1;
                    const auto end = status.find('\n', value_start);
                    return status.substr(value_start, end - value_start);
                };
                const std::string body = "{\"version\":\"0.3.0\",\"entities\":" + find_count("entities") +
                    ",\"relationships\":" + find_count("relationships") + ",\"memories\":" + find_count("memories") +
                    ",\"workspace\":\"" + json_escape(platform_.workspace_root().string()) + "\",\"health\":\"online\"}";
                respond(client, 200, "OK", "application/json", body);
            } else if (path == "/api/projects" && method == "GET") {
                const auto projects = platform_.projects();
                std::ostringstream body; body << "{\"projects\":[";
                for (std::size_t i = 0; i < projects.size(); ++i) {
                    if (i) body << ',';
                    const auto& p = projects[i];
                    body << "{\"id\":\"" << json_escape(p.id) << "\",\"name\":\"" << json_escape(p.name)
                         << "\",\"kind\":\"" << json_escape(p.kind) << "\",\"cmake\":" << std::boolalpha << p.has_cmake
                         << ",\"node\":" << p.has_node << ",\"git\":" << p.has_git << '}';
                }
                body << "]}"; respond(client, 200, "OK", "application/json", body.str());
            } else if (path == "/api/files" && method == "GET") {
                const auto project = query_value(target, "project");
                const auto relative = query_value(target, "path");
                const auto files = platform_.files(project, relative);
                std::ostringstream body; body << "{\"files\":[";
                for (std::size_t i = 0; i < files.size(); ++i) {
                    if (i) body << ',';
                    const auto& f = files[i];
                    body << "{\"name\":\"" << json_escape(f.name) << "\",\"path\":\"" << json_escape(f.relative_path)
                         << "\",\"directory\":" << std::boolalpha << f.directory << ",\"size\":" << f.size << '}';
                }
                body << "]}"; respond(client, 200, "OK", "application/json", body.str());
            } else if (path == "/api/file" && method == "GET") {
                const auto project = query_value(target, "project");
                const auto relative = query_value(target, "path");
                const auto content = platform_.read_text_file(project, relative);
                if (!content) respond(client, 404, "Not Found", "application/json", "{\"error\":\"file is unavailable, unsafe, binary, or too large\"}");
                else {
                    platform_.record("files", "Viewed " + project + "/" + relative);
                    respond(client, 200, "OK", "application/json", "{\"content\":\"" + json_escape(*content) + "\"}");
                }
            } else if (path == "/api/activity" && method == "GET") {
                const auto activity = platform_.recent_activity();
                std::ostringstream body; body << "{\"items\":[";
                for (std::size_t i = 0; i < activity.size(); ++i) {
                    if (i) body << ',';
                    const auto& a = activity[i];
                    body << "{\"timestamp\":\"" << iso_time(a.timestamp) << "\",\"category\":\"" << json_escape(a.category)
                         << "\",\"message\":\"" << json_escape(a.message) << "\",\"success\":" << std::boolalpha << a.success << '}';
                }
                body << "]}"; respond(client, 200, "OK", "application/json", body.str());
            } else if (path == "/api/reindex" && method == "POST") {
                const auto count = platform_.projects().size();
                platform_.record("projects", "Workspace reindexed: " + std::to_string(count) + " projects");
                respond(client, 200, "OK", "application/json", "{\"projects\":" + std::to_string(count) + "}");
            } else if (path == "/api/demo" && method == "POST") {
                try {
                    auto actor = runtime_.graph().create_entity("identity", "Portal Operator");
                    auto project = runtime_.graph().create_entity("project", "Exotic Portal");
                    auto engine = runtime_.graph().create_entity("system", "Universal State Graph");
                    runtime_.graph().connect(project->id(), engine->id(), "contains", 1.0);
                    runtime_.graph().connect(actor->id(), project->id(), "controls", 1.0);
                    runtime_.security().grant(actor->id(), Permission::Admin);
                    const auto result = runtime_.cycle(actor->id(), project->id(), "portal_command", 8.0,
                        Action{project->id(), "mobile_cycle", Value("complete"), 0.95});
                    platform_.record("runtime", std::string("Intelligence loop executed: ") + (result.executed ? "success" : "blocked"), result.executed);
                    std::ostringstream body;
                    body << std::boolalpha << std::setprecision(8) << "{\"prediction\":" << result.prediction.estimate
                         << ",\"confidence\":" << result.prediction.confidence << ",\"alignment\":" << result.alignment.overall
                         << ",\"executed\":" << result.executed << '}';
                    respond(client, 200, "OK", "application/json", body.str());
                } catch (const std::exception& error) {
                    platform_.record("runtime", error.what(), false);
                    respond(client, 500, "Internal Server Error", "application/json", "{\"error\":\"" + json_escape(error.what()) + "\"}");
                }
            } else respond(client, 404, "Not Found", "application/json", "{\"error\":\"unknown endpoint\"}");
        } else respond(client, 404, "Not Found", "text/plain; charset=utf-8", "Not found");
        close_socket(client);
    }
    stop();
    return 0;
}

} // namespace exotic
