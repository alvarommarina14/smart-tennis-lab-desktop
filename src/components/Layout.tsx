import { NavLink, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/auth/store';

import './Layout.css';

export function Layout() {
  const coach = useAuthStore((state) => state.coach);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <nav className="layout__nav">
          <NavLink to="/" end className="layout__icon-btn" title="Partidos" aria-label="Partidos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="14" y2="17" />
            </svg>
          </NavLink>
          <NavLink to="/alumnos" className="layout__icon-btn" title="Alumnos" aria-label="Alumnos">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" />
            </svg>
          </NavLink>
        </nav>

        <button
          type="button"
          className="layout__icon-btn layout__logout"
          onClick={signOut}
          title="Salir"
          aria-label={`Salir (${coach?.fullName ?? ''})`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
            <polyline points="15 17 20 12 15 7" />
            <line x1="20" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </aside>

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}
