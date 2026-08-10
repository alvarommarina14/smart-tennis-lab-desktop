import { useEffect } from 'react';

import { useAuthStore } from '@/auth/store';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';

export function App() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === 'loading') {
    return null;
  }

  return status === 'signedIn' ? <HomeScreen /> : <LoginScreen />;
}
