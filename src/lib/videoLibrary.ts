const STORAGE_KEY = 'stl.videoPaths';

// La ruta del video vive solo en esta máquina: el backend guarda el momento de cada evento, no
// dónde está el archivo. Si el profe lo mueve, la app le vuelve a preguntar.
function readAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function rememberVideo(matchId: string, path: string) {
  const all = readAll();
  all[matchId] = path;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function videoFor(matchId: string): string | null {
  return readAll()[matchId] ?? null;
}

export function forgetVideo(matchId: string) {
  const all = readAll();
  delete all[matchId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
