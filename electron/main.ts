import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, safeStorage } from 'electron';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

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

const VIDEO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ts': 'video/mp2t',
};

function fileStream(filePath: string, start?: number, end?: number) {
  const node =
    start === undefined ? createReadStream(filePath) : createReadStream(filePath, { start, end });
  return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>;
}

// El <video> pide el archivo por tramos (cabecera Range) para poder saltar por un partido de dos
// horas sin bajarlo entero. Hay que responder esos tramos a mano: net.fetch sobre file:// ignora
// el Range y devuelve todo con estado 200, y ahí Chromium no puede leer la duración de un MP4 con
// el moov al final, así que la barra de reproducción se queda pegada en 0.
function registerVideoProtocol() {
  protocol.handle(VIDEO_SCHEME, (request) => {
    const requested = new URL(request.url).searchParams.get('path');
    if (!requested || !allowedVideos().includes(requested) || !existsSync(requested)) {
      return new Response('No autorizado', { status: 403 });
    }

    const size = statSync(requested).size;
    const type = VIDEO_MIME[path.extname(requested).toLowerCase()] ?? 'video/mp4';
    const range = request.headers.get('range');

    if (!range) {
      return new Response(fileStream(requested), {
        status: 200,
        headers: {
          'Content-Type': type,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (match[1] === '' && match[2] === '')) {
      return new Response('Rango inválido', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    const start = match[1] === '' ? size - Number(match[2]) : Number(match[1]);
    const end = match[1] === '' || match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);

    if (!Number.isFinite(start) || start < 0 || start > end || start >= size) {
      return new Response('Rango fuera de límites', {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      });
    }

    return new Response(fileStream(requested, start, end), {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
      },
    });
  });
}

function registerIpc(window: BrowserWindow) {
  ipcMain.handle('session:read', () => readSession());
  ipcMain.handle('session:write', (_event, payload: string) => writeSession(payload));
  ipcMain.handle('session:clear', () => clearSession());

  // La ventana es sin marco (frame: false) para poder dibujar los controles de
  // minimizar/maximizar/cerrar con el estilo de la app en vez del que pone Windows.
  ipcMain.handle('window:minimize', () => window.minimize());
  ipcMain.handle('window:toggleMaximize', () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });
  ipcMain.handle('window:close', () => window.close());
  ipcMain.handle('window:isMaximized', () => window.isMaximized());

  window.on('maximize', () => window.webContents.send('window:maximized-changed', true));
  window.on('unmaximize', () => window.webContents.send('window:maximized-changed', false));

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
    frame: false,
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
  // La app no usa la barra de menú nativa (File / Edit / View / …). Sacarla deja la ventana
  // limpia; los atajos que importan (copiar, pegar, recargar en dev) los maneja Chromium igual.
  Menu.setApplicationMenu(null);

  registerVideoProtocol();
  const window = createWindow();
  registerIpc(window);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow();
      registerIpc(newWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
