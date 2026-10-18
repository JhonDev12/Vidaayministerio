const { app, BrowserWindow, ipcMain, net, Menu, shell } = require('electron');
const path = require('path');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 420, minHeight: 600,
    title: 'Programa VyM', backgroundColor: '#f3f5fa', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'www', 'icon-512.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // los enlaces externos se abren en el navegador
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}

// Lectura de jw.org desde el proceso principal (sin restricciones CORS)
ipcMain.handle('fetch-text', async (_e, url) => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'wol.jw.org') return { status: 400, text: '' };
    const r = await net.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ProgramaVyM', 'Accept-Language': 'es' } });
    return { status: r.status, text: await r.text() };
  } catch (err) {
    return { status: 599, text: '', error: String(err && err.message || err) };
  }
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
