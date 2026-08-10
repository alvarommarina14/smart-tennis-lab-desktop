import { useAuthStore } from '@/auth/store';
import { Button, Card } from '@/components/ui';

import './HomeScreen.css';

export function HomeScreen() {
  const coach = useAuthStore((state) => state.coach);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <div className="home">
      <header className="home__header">
        <div>
          <h1 className="home__title">Smart Tennis Lab</h1>
          <p className="home__subtitle">{coach?.fullName}</p>
        </div>
        <Button variant="secondary" onClick={signOut}>
          Salir
        </Button>
      </header>

      <Card>
        <h2 className="home__next">Próximo paso</h2>
        <p className="home__text">
          Acá van a ir los alumnos, los partidos y la pantalla de análisis sobre video. La sesión
          contra el backend ya funciona.
        </p>
      </Card>
    </div>
  );
}
