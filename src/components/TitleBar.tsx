import { useEffect, useState } from 'react';

import './TitleBar.css';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.stl?.window.isMaximized().then(setMaximized);
    return window.stl?.window.onMaximizedChange(setMaximized);
  }, []);

  return (
    <header className="titlebar">
      <div
        className="titlebar__drag"
        onDoubleClick={() => window.stl?.window.toggleMaximize()}
      >
        <div className="titlebar__brand">
          <span className="titlebar__mark" aria-hidden="true" />
        </div>
      </div>

      <div className="titlebar__controls">
        <button
          type="button"
          className="titlebar__button"
          aria-label="Minimizar"
          onClick={() => window.stl?.window.minimize()}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          type="button"
          className="titlebar__button"
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => window.stl?.window.toggleMaximize()}
        >
          {maximized ? (
            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
              <rect
                x="2.5"
                y="0.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path d="M0.5 2.5H7.5V9.5H0.5Z" fill="var(--surface)" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="titlebar__button titlebar__button--close"
          aria-label="Cerrar"
          onClick={() => window.stl?.window.close()}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
