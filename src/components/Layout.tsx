import { NavLink, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/auth/store';
import { Button } from '@/components/ui';

import './Layout.css';

export function Layout() {
  const coach = useAuthStore((state) => state.coach);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">
          <strong>Smart Tennis Lab</strong>
          <span>{coach?.fullName}</span>
        </div>

        <nav className="layout__nav">
          <NavLink to="/" end className="layout__link">
            Alumnos
          </NavLink>
        </nav>

        <Button variant="secondary" onClick={signOut}>
          Salir
        </Button>
      </aside>

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}
