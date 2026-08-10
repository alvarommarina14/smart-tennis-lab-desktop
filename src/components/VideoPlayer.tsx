import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
  onError?: (message: string) => void;
};

const RATES = [0.25, 0.5, 1, 1.5, 2];

export const VideoPlayer = forwardRef<VideoHandle, Props>(function VideoPlayer(
  { src, onReady, onError },
  ref
) {
  const video = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

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

  function skip(seconds: number) {
    if (video.current) {
      video.current.currentTime = Math.max(0, video.current.currentTime + seconds);
    }
  }

  return (
    <div className="player">
      <video
        ref={video}
        className="player__video"
        src={src}
        controls={false}
        onLoadedMetadata={(event) => {
          const ms = Math.round(event.currentTarget.duration * 1000);
          setDuration(ms);
          onReady?.(ms);
        }}
        onTimeUpdate={(event) => setCurrent(Math.round(event.currentTarget.currentTime * 1000))}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() =>
          onError?.(
            'El video no se pudo reproducir. Puede estar en H.265/HEVC, que Chromium no soporta: convertilo a H.264.'
          )
        }
      />

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
          max={duration || 0}
          value={current}
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
