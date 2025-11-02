const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const { handleDownloadRequest, detectPlatformFromUrl, setMainWindow, setPluginsDir } = require('./backend/downloadManager');
const { autoUpdater } = require('electron-updater');

const store = new Store();
let mainWindow;
let tray;
let shouldQuit = false;
let pluginsDir;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 750,
    backgroundColor: '#0f0f10',
    icon: path.join(__dirname, 'assets/filekit.png'),
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Filekit'
  });

  setMainWindow(mainWindow);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('close', (e) => {
    const keepInTray = store.get('keepInTray', true);
    if (!shouldQuit && keepInTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'filekit.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar', click: () => mainWindow.show() },
    { label: 'Sair', click: () => { shouldQuit = true; app.quit(); } }
  ]);
  tray.setToolTip('Foooly Filekit');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  pluginsDir = path.join(app.getPath('userData'), 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }
  setPluginsDir(pluginsDir);

  // iniciar com o sistema
  const startOnBoot = store.get('startOnBoot', false);
  app.setLoginItemSettings({
    openAtLogin: startOnBoot
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  autoUpdater.autoDownload = true;
  autoUpdater.checkForUpdates();

  // Eventos
  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        state: 'available',
        info
      });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        state: 'downloading',
        progress
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        state: 'downloaded',
        info
      });
    }
    // autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        state: 'error',
        error: err.message
      });
    }
  });
});

app.on('before-quit', () => {
  shouldQuit = true;
});

// IPCs
ipcMain.handle('choose-folder', async (event, defaultPath) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher pasta de destino',
    defaultPath: defaultPath || app.getPath('downloads'),
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('detect-platform', (event, url) => {
  return detectPlatformFromUrl(url);
});

ipcMain.handle('start-download', async (event, payload) => {
  try {
    const result = await handleDownloadRequest(payload);
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Abrir Pasta PLUGINS
ipcMain.handle('open-plugins-folder', () => {
  if (pluginsDir) {
    shell.openPath(pluginsDir);
    return { ok: true, path: pluginsDir };
  }
  return { ok: false, error: 'Plugins dir not set' };
});

ipcMain.handle('get-settings', () => {
  return {
    startOnBoot: store.get('startOnBoot', false),
    keepInTray: store.get('keepInTray', true),
    version: app.getVersion()
  };
});

//Atualizar app
ipcMain.handle('install-update-now', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('set-settings', (event, settings) => {
  if (typeof settings.startOnBoot === 'boolean') {
    store.set('startOnBoot', settings.startOnBoot);
    app.setLoginItemSettings({ openAtLogin: settings.startOnBoot });
  }
  if (typeof settings.keepInTray === 'boolean') {
    store.set('keepInTray', settings.keepInTray);
  }
  return { ok: true };
});

ipcMain.handle('check-plugins', async () => {
  const pluginsDir = path.join(app.getPath('userData'), 'plugins');
  const ytPath = path.join(pluginsDir, 'yt-dlp.exe');
  const ffPath = path.join(pluginsDir, 'ffmpeg.exe');
  const exists = {
    yt: fs.existsSync(ytPath),
    ff: fs.existsSync(ffPath)
  };
  return exists;
});

ipcMain.handle('open-web-popup', (event, url) => {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const bounds = parent ? parent.getBounds() : { width: 1050, height: 650 };

  const popup = new BrowserWindow({
    width: Math.floor(bounds.width * 0.95),
    height: Math.floor(bounds.height * 0.95),
    parent: parent || undefined,
    modal: false,
    backgroundColor: '#0f0f10',
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: true
    },
    title: 'Filekit - Web'
  });

  popup.loadURL(url);
  // popup.webContents.on('will-navigate', ...)
  return { ok: true };
});

// salvar item no histórico
ipcMain.handle('add-download-log', (event, entry) => {
  const logPath = path.join(app.getPath('userData'), 'downloads.json');
  let logs = [];
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }
  logs.unshift({
    ...entry,
    date: entry.date || new Date().toISOString(),
  });
  if (logs.length > 200) logs = logs.slice(0, 200);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  return { ok: true };
});

ipcMain.handle('get-download-logs', () => {
  const logPath = path.join(app.getPath('userData'), 'downloads.json');
  if (!fs.existsSync(logPath)) return [];
  try {
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    return logs;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('open-file-location', (event, filePath) => {
  if (!filePath) return { ok: false, error: 'Sem caminho.' };
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return { ok: true };
  }
  return { ok: false, error: 'Arquivo não existe mais.' };
});