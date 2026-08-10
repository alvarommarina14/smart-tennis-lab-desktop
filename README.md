# Smart Tennis Lab — Desktop

App de escritorio para analizar partidos de tenis **sobre video grabado**. El profe abre la
grabación de la cancha, la mira tranquilo desde su casa y va cargando estadísticas; después las
trabaja con el alumno y le manda el reporte en PDF.

Es la contraparte de la [app móvil](../mobile), que sirve para el otro caso: cargar un partido
**en vivo**, desde la cancha y sin señal. Las dos hablan con el mismo [backend](../backend).

## Stack

| | |
|---|---|
| Shell | Electron 34 |
| UI | React 19 + Vite 7 |
| Lenguaje | TypeScript (strict) |
| Estado servidor | TanStack Query |
| Estado local | Zustand |
| Tests | Vitest |

## Decisiones de diseño

**Electron y no un navegador**, porque la app tiene que instalarse en la PC del profe. Windows
primero; macOS queda para más adelante y no cambia el código, pero sí exige firmar y notarizar.

**El video no se sube a ningún lado.** Se abre desde el disco y lo único que viaja al backend son
los KPIs y el momento de cada uno dentro del video (`video_offset_ms`). Un partido en 1080p pesa
unos 4 GB: guardarlos en la nube costaría más que todo el resto del proyecto junto, y no haría
falta, porque al alumno le llega un PDF y no el video.

**Nada de cola offline.** En mobile es imprescindible, porque en la cancha no hay señal. Acá el
profe está en su casa con wifi, así que se habla directo con la API.

**El marcador es un archivo copiado, no un paquete compartido.** `src/lib/tennisScore.ts` es igual
al de mobile, con los mismos tests. Es una función pura de 160 líneas: duplicarla sale más barato
que montar un monorepo. El día que lo compartido crezca más allá del marcador y los tipos de la
API, ahí se extrae un paquete.

**Los tokens no van a `localStorage`.** Se guardan cifrados con la clave del sistema operativo
(DPAPI en Windows, llavero en macOS) desde el proceso principal, y el renderer los pide por IPC.
El renderer corre con `contextIsolation`, sin Node y en sandbox: lo único que ve del sistema es lo
que expone `electron/preload.ts`.

## Cómo levantarlo

```bash
cp .env.example .env    # y apuntá VITE_API_URL a tu backend
npm install
npm run dev             # Vite en :5173 + la ventana de Electron
```

Se entra con la misma cuenta que en la app del celular.

```bash
npm run typecheck
npm run lint
npm test
npm run build           # compila el main y el renderer
```

## Estructura

```
electron/     proceso principal y preload (lo único con acceso al sistema)
src/
├── api/      cliente HTTP contra el backend
├── auth/     sesión cifrada y store de Zustand
├── screens/  pantallas
├── components/
├── lib/      marcador de tenis y utilidades
└── theme/    tokens de diseño
```

## Sobre el codec del video

Las cámaras de club suelen venir configuradas en **H.265+**, que **Chromium no reproduce** — está
verificado: `canPlayType` devuelve vacío para todas las variantes de HEVC, y Electron usa el mismo
motor. Hay dos salidas, en orden de preferencia:

1. **Configurar la cámara en H.264.** Es una opción del stream principal en la configuración web de
   la cámara. Si se puede, no hace falta nada más.
2. **Transcodificar al importar**, con FFmpeg empaquetado en la app. Una pasada por video, y de
   paso arregla el scrubbing, que en H.265+ es lento por los GOP largos.
