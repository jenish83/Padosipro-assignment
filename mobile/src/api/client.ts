import { API_URL } from '../config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};
/** Called when the server says the session is no longer valid, so the app can log the user out. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

const SESSION_ERRORS = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHENTICATED', 'EMAIL_NOT_VERIFIED'];
const TIMEOUT_MS = 15000;

export async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(useAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : "Can't reach the server. Check your internet connection and try again."
    );
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (res.ok) return data as T;

  const err = data?.error;
  const apiError = new ApiError(
    res.status,
    err?.code ?? 'UNKNOWN',
    err?.message ?? 'Something went wrong. Please try again.',
    err?.fields,
    err?.details
  );
  if (useAuth && SESSION_ERRORS.includes(apiError.code)) onUnauthorized?.();
  throw apiError;
}
