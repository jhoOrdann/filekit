const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: (defaultPath) => ipcRenderer.invoke('choose-folder', defaultPath),
  detectPlatform: (url) => ipcRenderer.invoke('detect-platform', url),
  startDownload: (payload) => ipcRenderer.invoke('start-download', payload),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  openExternal: (url) => shell.openExternal(url),
  checkPlugins: () => ipcRenderer.invoke('check-plugins'),
  openPluginsFolder: () => ipcRenderer.invoke('open-plugins-folder'),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, data) => cb(data)),
  onDownloadLog: (cb) => ipcRenderer.on('download-log', (_e, data) => cb(data)),
  openExternal: (url) => shell.openExternal(url),
  openWebPopup: (url) => ipcRenderer.invoke('open-web-popup', url),
  addDownloadLog: (entry) => ipcRenderer.invoke('add-download-log', entry),
  getDownloadLogs: () => ipcRenderer.invoke('get-download-logs'),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  onUpdateStatus: (cb) => {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('update-status', (_e, data) => cb(data));
  },
  installUpdateNow: () => {
    const { ipcRenderer } = require('electron');
    return ipcRenderer.invoke('install-update-now');
  }
});