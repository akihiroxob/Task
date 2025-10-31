import { app, BrowserWindow } from 'electron';
import * as path from 'path';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Todo & Sticky Notes',
  });

  const indexFile = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexFile).catch((error) => {
    console.error('Failed to load renderer:', error);
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' }).catch(() => {
      /* ignore */
    });
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
