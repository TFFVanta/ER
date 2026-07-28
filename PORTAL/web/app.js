const q = new URLSearchParams(location.search);
const token = q.get("token") || localStorage.getItem("exotic_token") || "";

if (token) {
  localStorage.setItem("exotic_token", token);
}

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-EXOTIC-Token": token,
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }
  return data;
};

const state = {
  activePage: "home",
  statusSignature: "",
  logsSignature: "",
  logsLoaded: false,
  filesLoaded: false,
  filePath: "",
  openedFile: "",
  drafts: new Map()
};

const bar = document.getElementById("bar");
const refresh = document.getElementById("refresh");
const logsRefresh = document.getElementById("logsRefresh");
const filesList = document.getElementById("filesList");
const editorCard = document.getElementById("editorCard");
const fileName = document.getElementById("fileName");
const editor = document.getElementById("editor");
const back = document.getElementById("back");
const save = document.getElementById("save");

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && el.textContent !== value) {
    el.textContent = value;
  }
}

function page(id) {
  state.activePage = id;

  document.querySelectorAll(".page").forEach(el => {
    el.classList.toggle("active", el.id === id);
  });

  document.querySelectorAll("nav button").forEach(el => {
    el.classList.toggle("active", el.dataset.page === id);
  });

  if (id === "observe" && !state.logsLoaded) {
    void logs();
  }

  if (id === "files" && !state.filesLoaded) {
    void files(state.filePath);
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.onclick = () => page(button.dataset.page);
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.onclick = async () => {
    try {
      toast("Starting " + button.dataset.action);
      await api("/api/action", {
        method: "POST",
        body: JSON.stringify({ action: button.dataset.action })
      });
      void status();
    } catch (error) {
      toast(error.message);
    }
  };
});

async function status() {
  try {
    const data = await api("/api/status");
    const signature = JSON.stringify(data);

    if (signature === state.statusSignature) {
      return;
    }

    state.statusSignature = signature;

    const runtimeState = data.state;
    const systemState = data.system;
    const progress = Math.max(0, Math.min(100, Number(runtimeState.build.progress) || 0));

    setText("host", systemState.host);
    setText("buildState", String(runtimeState.build.status || "idle").toUpperCase());
    setText("task", runtimeState.task || "Ready");
    setText("pct", progress + "%");
    setText("systemHost", systemState.host);
    setText("systemDisk", String(systemState.free_gb) + " GB");
    setText("systemUpdated", systemState.time);

    if (bar.style.width !== progress + "%") {
      bar.style.width = progress + "%";
    }
  } catch {
    // keep last good state visible
  }
}

async function logs(force = false) {
  const pre = document.querySelector("#logs");
  const wasNearBottom = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 24;

  try {
    const data = await api("/api/logs");
    const nextText = (data.lines || []).join("\n") || "No activity";

    if (!force && nextText === state.logsSignature) {
      state.logsLoaded = true;
      return;
    }

    state.logsSignature = nextText;
    pre.textContent = nextText;
    state.logsLoaded = true;

    if (wasNearBottom) {
      pre.scrollTop = pre.scrollHeight;
    }
  } catch (error) {
    if (force) {
      toast(error.message);
    }
  }
}

function rememberDraft() {
  if (state.openedFile) {
    state.drafts.set(state.openedFile, editor.value);
  }
}

editor.addEventListener("input", rememberDraft);

async function files(pathValue = "", force = false) {
  try {
    const data = await api("/api/files?path=" + encodeURIComponent(pathValue));

    state.filePath = data.path || "";
    state.filesLoaded = true;
    setText("path", state.filePath || "C:\\Projects\\Exotic");

    if (!force && filesList.dataset.path === state.filePath) {
      return;
    }

    filesList.dataset.path = state.filePath;
    filesList.innerHTML = "";

    for (const item of data.items || []) {
      const button = document.createElement("button");
      button.className = "file";
      button.innerHTML = `<span>${item.type === "directory" ? "▣" : "□"} ${item.name}</span><small>${item.type}</small>`;
      button.onclick = () => item.type === "directory" ? void files(item.path, true) : void openFile(item.path);
      filesList.appendChild(button);
    }
  } catch (error) {
    toast(error.message);
  }
}

async function openFile(pathValue) {
  try {
    const data = await api("/api/files?path=" + encodeURIComponent(pathValue));
    state.openedFile = pathValue;
    fileName.textContent = data.name;
    editor.value = state.drafts.get(pathValue) ?? data.content ?? "";
    editorCard.classList.remove("hidden");
  } catch (error) {
    toast(error.message);
  }
}

refresh.onclick = () => void status();
logsRefresh.onclick = () => void logs(true);

back.onclick = () => {
  const parts = state.filePath.split("/").filter(Boolean);
  parts.pop();
  void files(parts.join("/"), true);
};

save.onclick = async () => {
  try {
    await api("/api/file", {
      method: "POST",
      body: JSON.stringify({
        path: state.openedFile,
        content: editor.value
      })
    });
    state.drafts.delete(state.openedFile);
    toast("Saved with backup");
  } catch (error) {
    toast(error.message);
  }
};

void status();
setInterval(() => {
  void status();
  if (state.activePage === "observe") {
    void logs();
  }
}, 3000);
