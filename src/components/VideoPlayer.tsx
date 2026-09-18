import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import './VideoPlayer.css';

export type VideoHandle = {
  currentMs: () => number;
  seekMs: (ms: number) => void;
  isPlaying: () => boolean;
  togglePlay: () => void;
  pause: () => void;
};

type Props = {
  src: string;
  onReady?: (durationMs: number) => void;
  onProgress?: (currentMs: number) => void;
  onError?: (message: string) => void;
};

const RATES = [0.25, 0.5, 1, 1.5, 2];
const VOLUME_KEY = 'stl.video.volume';

function readSavedVolume() {
  try {
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 1;
  } catch {
    return 1;
  }
}

export const VideoPlayer = forwardRef<VideoHandle, Props>(function VideoPlayer(
  { src, onReady, onProgress, onError },
  ref
) {
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(readSavedVolume);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Relación de aspecto real del video (ancho / alto). Sin esto la caja queda fija en 16:9 y un
  // video 4:3 o vertical entra con bandas negras al costado; con el ratio real la caja se adapta.
  const [ratio, setRatio] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    currentMs: () => Math.round((video.current?.currentTime ?? 0) * 1000),
    seekMs: (ms: number) => {
      if (video.current) {
        video.current.currentTime = Math.max(0, ms / 1000);
      }
    },
    isPlaying: () => Boolean(video.current && !video.current.paused),
    togglePlay: () => {
      if (!video.current) return;
      if (video.current.paused) {
        void video.current.play();
      } else {
        video.current.pause();
      }
    },
    pause: () => video.current?.pause(),
  }));

  useEffect(() => {
    if (video.current) {
      video.current.playbackRate = rate;
    }
  }, [rate]);

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      video.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      return;
    }
  }, [volume]);

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === container.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function readAspectRatio(element: HTMLVideoElement) {
    if (element.videoWidth > 0 && element.videoHeight > 0) {
      setRatio(element.videoWidth / element.videoHeight);
    }
  }

  const frameRatio = ratio ?? 16 / 9;
  const frameStyle: CSSProperties | undefined = fullscreen
    ? undefined
    : ({ '--player-ratio': frameRatio, aspectRatio: String(frameRatio) } as CSSProperties);

  function skip(seconds: number) {
    if (video.current) {
      video.current.currentTime = Math.max(0, video.current.currentTime + seconds);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.current?.requestFullscreen();
    }
  }

  return (
    <div className="player" ref={container}>
      <div className="player__frame" style={frameStyle}>
        <video
          ref={video}
          className="player__video"
          src={src}
          controls={false}
          onLoadedMetadata={(event) => {
            readAspectRatio(event.currentTarget);
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds)) {
              const ms = Math.round(seconds * 1000);
              setDuration(ms);
              onReady?.(ms);
            }
          }}
          onLoadedData={(event) => readAspectRatio(event.currentTarget)}
          onDurationChange={(event) => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds)) {
              setDuration(Math.round(seconds * 1000));
            }
          }}
          onTimeUpdate={(event) => {
            const ms = Math.round(event.currentTarget.currentTime * 1000);
            setCurrent(ms);
            onProgress?.(ms);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() =>
            onError?.(
              'El video no se pudo reproducir. Puede estar en H.265/HEVC, que Chromium no soporta: convertilo a H.264.'
            )
          }
        />
      </div>

      <div className="player__bar">
        <button type="button" className="player__button" onClick={() => skip(-10)} title="10 s atrás">
          «10s
        </button>
        <button type="button" className="player__button" onClick={() => skip(-3)} title="3 s atrás">
          «3s
        </button>
        <button
          type="button"
          className="player__button player__button--main"
          onClick={() => {
            if (!video.current) return;
            if (video.current.paused) void video.current.play();
            else video.current.pause();
          }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="player__button" onClick={() => skip(3)} title="3 s adelante">
          3s»
        </button>
        <button type="button" className="player__button" onClick={() => skip(10)} title="10 s adelante">
          10s»
        </button>

        <input
          className="player__seek"
          type="range"
          min={0}
          max={duration}
          value={Math.min(current, duration)}
          disabled={duration === 0}
          onChange={(event) => {
            const ms = Number(event.target.value);
            setCurrent(ms);
            if (video.current) {
              video.current.currentTime = ms / 1000;
            }
          }}
        />

        <span className="player__time">
          {formatClock(current)} / {formatClock(duration)}
        </span>

        <div className="player__volume">
          <button
            type="button"
            className="player__button"
            onClick={() => setMuted((value) => !value)}
            title={muted || volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {muted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            className="player__volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            title="Volumen"
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              setMuted(next === 0);
            }}
          />
        </div>

        <select
          className="player__rate"
          value={rate}
          onChange={(event) => setRate(Number(event.target.value))}
        >
          {RATES.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>

        <button
          type="button"
          className="player__button player__button--fs"
          onClick={toggleFullscreen}
          title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          ⛶
        </button>
      </div>
    </div>
  );
});

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
