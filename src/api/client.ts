import { getAccessToken, refreshAccessToken } from '@/auth/session';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  skipAuth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  if (response.status === 401 && !options.skipAuth) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      const retry = await send(path, options);
      return handle<T>(retry);
    }
  }

  return handle<T>(response);
}

async function send(path: string, options: RequestOptions) {
  const { body, headers, skipAuth, ...rest } = options;
  const token = skipAuth ? null : getAccessToken();

  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const { message, fields } = await readError(response);
    throw new ApiError(response.status, message, fields);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type DownloadedFile = { blob: Blob; fileName: string | null };

export async function apiRequestFile(path: string, accept: string): Promise<DownloadedFile> {
  const options: RequestOptions = { headers: { Accept: accept } };
  const response = await send(path, options);

  if (response.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      return handleFile(await send(path, options));
    }
  }

  return handleFile(response);
}

async function handleFile(response: Response): Promise<DownloadedFile> {
  if (!response.ok) {
    const { message } = await readError(response);
    throw new ApiError(response.status, message);
  }

  const disposition = response.headers.get('content-disposition');
  const fileName = disposition ? /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? null : null;
  return { blob: await response.blob(), fileName };
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string;
      detail?: string;
      fields?: Record<string, string>;
    };
    return {
      message: payload.message ?? payload.detail ?? `HTTP ${response.status}`,
      fields: payload.fields,
    };
  } catch {
    return { message: `HTTP ${response.status}`, fields: undefined };
  }
}
