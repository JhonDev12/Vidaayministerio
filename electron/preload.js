const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  fetchText: (url) => ipcRenderer.invoke('fetch-text', url),
  platform: process.platform,
});
