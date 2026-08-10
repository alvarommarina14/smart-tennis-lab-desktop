import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DEV_SERVER_URL = 'http://localhost:5173';
const isDev = !app.isPackaged;

function sessionFile() {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'session.bin');
}

// Los tokens se cifran con la clave del sistema operativo (DPAPI en Windows, llavero en macOS).
// Guardarlos en localStorage del renderer los dejaría en texto plano en el disco.
function readSession(): string | null {
  const file = sessionFile();
  if (!existsSync(file)) {
    return null;
  }
  try {
    const raw = readFileSync(file);
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf8');
  } catch {
    return null;
  }
}

function writeSession(payload: string) {
  const file = sessionFile();
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(payload)
    : Buffer.from(payload, 'utf8');
  writeFileSync(file, data);
}

function clearSession() {
  const file = sessionFile();
  if (existsSync(file)) {
    rmSync(file);
  }
}

function registerIpc() {
  ipcMain.handle('session:read', () => readSession());
  ipcMain.handle('session:write', (_event, payload: string) => writeSession(payload));
  ipcMain.handle('session:clear', () => clearSession());

  ipcMain.handle('video:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Elegí el video del partido',
      properties: ['openFile'],
      filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'mov', 'avi', 'm4v', 'ts'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F1418',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  if (isDev) {
    window.loadURL(DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  registerIpc();
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
