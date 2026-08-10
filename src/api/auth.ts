import { apiRequest } from '@/api/client';
import type { AuthPayload, Coach } from '@/auth/session';
import { getRefreshToken } from '@/auth/session';

export function login(email: string, password: string) {
  return apiRequest<AuthPayload>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
}

export function register(email: string, password: string, fullName: string) {
  return apiRequest<AuthPayload>('/api/v1/auth/register', {
    method: 'POST',
    body: { email, password, fullName },
    skipAuth: true,
  });
}

export function fetchMe() {
  return apiRequest<Coach>('/api/v1/auth/me');
}

export function updateProfile(email: string, fullName: string) {
  return apiRequest<Coach>('/api/v1/auth/me', {
    method: 'PUT',
    body: { email, fullName },
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<AuthPayload>('/api/v1/auth/me/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export function logout() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.resolve();
  }
  return apiRequest<void>('/api/v1/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    skipAuth: true,
  });
}
