// Elegir un archivo pasa por el proceso principal: el renderer no tiene acceso al sistema. Sin el
// puente (renderer abierto en el navegador para debuggear) no hay diálogo y se devuelve null.
export async function pickVideoFile(): Promise<string | null> {
  if (!window.stl?.video) {
    return null;
  }
  return window.stl.video.pick();
}

export async function videoFileExists(filePath: string): Promise<boolean> {
  if (!window.stl?.video) {
    return false;
  }
  return window.stl.video.exists(filePath);
}

// El video no se carga por file://, que Electron bloquea desde una página servida por http. Va por
// un protocolo propio que solo sirve los archivos que el profe eligió.
export function videoUrl(filePath: string) {
  return `stl-video://local/?path=${encodeURIComponent(filePath)}`;
}
