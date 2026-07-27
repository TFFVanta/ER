const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const workspace = process.env.EXOTIC_WORKSPACE || 'C:\\Projects\\Exotic';
const apiUrl = process.env.EXOTIC_CONSOLE_URL || 'http://127.0.0.1:8787';
let apiProcess = null;

function existing(candidates) {
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

function apiExecutable() {
  return existing([
    process.env.EXOTIC_CONSOLE_API,
    path.join(process.resourcesPath || '', 'native', 'exotic-console-api.exe'),
    path.join(__dirname, '..', 'native', 'exotic-console-api.exe'),
    path.join(workspace, 'out', 'build', 'console-v1.1', 'Release', 'exotic-console-api.exe'),
    path.join(workspace, 'out', 'build', 'x64-Release', 'Release', 'exotic-console-api.exe')
  ]);
}

function smokeExecutable() {
  return existing([
    process.env.EXOTIC_RUNTIME_SMOKE,
    path.join(process.resourcesPath || '', 'native', 'exotic-runtime-smoke.exe'),
    path.join(__dirname, '..', 'native', 'exotic-runtime-smoke.exe'),
    path.join(workspace, 'out', 'build', 'console-v1.1', 'Release', 'exotic-runtime-smoke.exe'),
    path.join(workspace, 'out', 'build', 'x64-Release', 'Release', 'exotic-runtime-smoke.exe')
  ]);
}

async function healthy() {
  try {
    const response = await fetch(apiUrl + '/api/v1/health', { cache: 'no-store' });
    return response.ok || response.status === 503;
  } catch {
    return false;
  }
}

async function startApi() {
  if (await healthy()) return;
  const executable = apiExecutable();
  if (!executable) {
    throw new Error('exotic-console-api.exe was not found. Run the EXOTIC console integration script first.');
  }
  const apiPort = new URL(apiUrl).port || '8787';
  const args = [
    '--workspace', workspace,
    '--assets', path.join(__dirname, '..', 'dist'),
    '--port', apiPort
  ];
  const smoke = smokeExecutable();
  if (smoke) args.push('--smoke', smoke);
  apiProcess = spawn(executable, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  apiProcess.stdout?.on('data', data => console.log(String(data).trim()));
  apiProcess.stderr?.on('data', data => console.error(String(data).trim()));
  apiProcess.on('exit', () => { apiProcess = null; });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await healthy()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('The EXOTIC console API did not become ready on 127.0.0.1:8787.');
}

async function createWindow() {
  try {
    await startApi();
  } catch (error) {
    dialog.showErrorBox('EXOTIC Operations Console', error.message);
  }

  const win = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f4f4ef',
    icon: path.join(__dirname, '..', 'public', 'er-logo.png'),
    title: 'EXOTIC Operations Console',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  await win.loadURL(apiUrl + '/?live=1');
}

app.whenReady().then(() => {
  app.setAppUserModelId('center.mingo.exotic.operations');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (apiProcess && !apiProcess.killed) apiProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
