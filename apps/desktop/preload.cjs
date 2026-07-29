const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('exoticDesktop', {
  desktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
