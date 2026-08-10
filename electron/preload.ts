import { contextBridge, ipcRenderer } from 'electron';

// Única superficie que el renderer ve del proceso principal. Todo lo que no esté acá no existe
// para la UI: sin acceso a fs ni a node.
const bridge = {
  session: {
    read: (): Promise<string | null> => ipcRenderer.invoke('session:read'),
    write: (payload: string): Promise<void> => ipcRenderer.invoke('session:write', payload),
    clear: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  },
  video: {
    pick: (): Promise<string | null> => ipcRenderer.invoke('video:pick'),
    exists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('video:exists', filePath),
  },
};

contextBridge.exposeInMainWorld('stl', bridge);

export type StlBridge = typeof bridge;
