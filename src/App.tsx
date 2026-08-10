import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { useAuthStore } from '@/auth/store';
import { Layout } from '@/components/Layout';
import { LoginScreen } from '@/screens/LoginScreen';
import { PlayersScreen } from '@/screens/PlayersScreen';

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
          <Route path="/" element={<PlayersScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
