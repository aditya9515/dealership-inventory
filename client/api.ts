export const TOKEN_KEY = 'motorstock.token';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Could not connect. Check that the server is running and try again.', 0);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('session-expired'));
    }
    const details = body.error?.details
      ?.map((item: { field: string; message: string }) => `${item.field}: ${item.message}`)
      .join(' ');
    throw new ApiError(
      details || body.error?.message || 'The request could not be completed.',
      response.status,
    );
  }
  return body as T;
}
export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
