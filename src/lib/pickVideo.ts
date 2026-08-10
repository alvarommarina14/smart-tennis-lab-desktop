// Elegir un archivo pasa por el proceso principal: el renderer no tiene acceso al sistema. Sin el
// puente (renderer abierto en el navegador para debuggear) no hay diálogo y se devuelve null.
export async function pickVideoFile(): Promise<string | null> {
  if (!window.stl?.video) {
    return null;
  }
  return window.stl.video.pick();
}
