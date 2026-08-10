import { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEV_SERVER_URL = 'http://localhost:5173';
const VIDEO_SCHEME = 'stl-video';
const isDev = !app.isPackaged;

protocol.registerSchemesAsPrivileged([
  {
    scheme: VIDEO_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function userDataFile(name: string) {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, name);
}

// Los tokens se cifran con la clave del sistema operativo (DPAPI en Windows, llavero en macOS).
// Guardarlos en localStorage del renderer los dejaría en texto plano en el disco.
function readSession(): string | null {
  const file = userDataFile('session.bin');
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
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(payload)
    : Buffer.from(payload, 'utf8');
  writeFileSync(userDataFile('session.bin'), data);
}

function clearSession() {
  const file = userDataFile('session.bin');
  if (existsSync(file)) {
    rmSync(file);
  }
}

// El renderer solo puede reproducir archivos que el profe eligió con el diálogo del sistema. La
// lista vive acá y no la puede ampliar la UI: sin esto, el protocolo serviría cualquier archivo
// del disco a quien supiera pedirlo.
function allowedVideos(): string[] {
  const file = userDataFile('videos.json');
  if (!existsSync(file)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as string[];
  } catch {
    return [];
  }
}

function allowVideo(filePath: string) {
  const all = allowedVideos();
  if (!all.includes(filePath)) {
    all.push(filePath);
    writeFileSync(userDataFile('videos.json'), JSON.stringify(all));
  }
}

function registerVideoProtocol() {
  protocol.handle(VIDEO_SCHEME, (request) => {
    const requested = new URL(request.url).searchParams.get('path');
    if (!requested || !allowedVideos().includes(requested) || !existsSync(requested)) {
      return new Response('No autorizado', { status: 403 });
    }
    // net.fetch sobre file:// respeta los Range, que es lo que hace posible moverse por un video
    // de dos horas sin descargarlo entero.
    return net.fetch(pathToFileURL(requested).toString(), { bypassCustomProtocolHandlers: true });
  });
}

function registerIpc() {
  ipcMain.handle('session:read', () => readSession());
  ipcMain.handle('session:write', (_event, payload: string) => writeSession(payload));
  ipcMain.handle('session:clear', () => clearSession());

  ipcMain.handle('video:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Elegí el video del partido',
      properties: ['openFile'],
      filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'mov', 'avi', 'm4v', 'ts', 'webm'] }],
    });
    if (result.canceled) {
      return null;
    }
    allowVideo(result.filePaths[0]);
    return result.filePaths[0];
  });

  ipcMain.handle('video:exists', (_event, filePath: string) => existsSync(filePath));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
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

  // En desarrollo, lo que pasa en el renderer tiene que verse en la consola donde corre la app:
  // si no, una pantalla en blanco no dice nada.
  if (isDev) {
    window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    window.webContents.on('did-fail-load', (_event, code, description) => {
      console.log(`[renderer] no cargó: ${description} (${code})`);
    });
    window.webContents.openDevTools({ mode: 'detach' });
  }

  if (isDev) {
    window.loadURL(DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  registerVideoProtocol();
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
