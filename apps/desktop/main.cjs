const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isDev = process.argv.includes('--dev');

// Gives the bridge its own per-user data directory instead of assuming a dev checkout at a
// fixed path - this is what lets a real install run standalone. Only set if not already
// provided (dev/testing can still override via the same env vars every other bridge caller
// in this codebase already uses).
function configureBridgeEnvironment() {
  const userData = app.getPath('userData');
  process.env.EXOTIC_BRIDGE_ROOT ||= path.join(userData, 'codex-bridge');
  process.env.EXOTIC_WORKSPACE_ROOT ||= path.join(userData, 'workspaces');
}

// In dev, import the live (unbundled) bridge script directly - it resolves its @exotic/*
// dependencies through the npm workspace's node_modules symlinks, same as running it
// standalone. In a packaged app there are no such symlinks, so package:win pre-bundles it
// into one self-contained file (see scripts/bundle-bridge.mjs) and this loads that instead.
async function startBridgeRuntime() {
  configureBridgeEnvironment();
  const bridgeEntry = isDev
    ? path.join(
        __dirname,
        '..',
        '..',
        'operations-console',
        'scripts',
        'codex-bridge-runtime.mjs',
      )
    : path.join(__dirname, 'bridge', 'codex-bridge-runtime.bundle.mjs');
  const bridgeModule = await import(pathToFileURL(bridgeEntry).href);
  // The packaged bundle may be built from a pinned older commit if the live bridge script
  // currently fails to bundle (see apps/desktop/scripts/bundle-bridge.mjs) - older versions
  // start themselves as a side effect of being imported rather than exporting startBridge().
  return bridgeModule.startBridge ? bridgeModule.startBridge() : undefined;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'EXOTIC',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // Configurable rather than hardcoded: Vite falls back to the next free port if 5173 is
    // already taken (e.g. another dev server already running), so a fixed assumption here
    // would silently point at a dead URL instead of the real one.
    win.loadURL(process.env.EXOTIC_STUDIO_DEV_URL || 'http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId('center.mingo.exotic');
  try {
    await startBridgeRuntime();
  } catch (error) {
    // Don't block the window from opening if the bridge fails to start - the Studio UI's
    // own offline indicator (see docs/WORKSPACE_SHELL_SPEC.md) surfaces this to the operator
    // instead of the app silently doing nothing.
    console.error('EXOTIC bridge failed to start:', error);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
