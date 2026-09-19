import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useAuthStore } from '@/auth/store';
import { Layout } from '@/components/Layout';
import { LoginScreen } from '@/screens/LoginScreen';
import { AnalysisScreen } from '@/screens/AnalysisScreen';
import { MatchesScreen } from '@/screens/MatchesScreen';
import { NewMatchScreen } from '@/screens/NewMatchScreen';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';
import { ReportScreen } from '@/screens/ReportScreen';

export function App() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === 'loading') {
    return null;
  }

  if (status === 'signedOut') {
    return <LoginScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MatchesScreen />} />
          <Route path="/partidos/nuevo" element={<NewMatchScreen />} />
          <Route path="/partidos/:id" element={<AnalysisScreen />} />
          <Route path="/partidos/:id/reporte" element={<ReportScreen />} />
          <Route path="/alumnos" element={<PlayersScreen />} />
          <Route path="/alumnos/:id" element={<PlayerScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
