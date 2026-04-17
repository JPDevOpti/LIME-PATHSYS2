const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
const AUTH_TOKEN_KEY = "pathsys_auth_token";
const AUTH_USER_KEY = "pathsys_auth_user";
const AUTH_REMEMBER_KEY = "pathsys_auth_remember";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY)
    ? localStorage
    : sessionStorage.getItem(AUTH_TOKEN_KEY)
      ? sessionStorage
      : null;
}

export function getAuthToken(): string | null {
  const storage = getStorage();
  return storage?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function setAuthStorage(
  token: string,
  user: unknown,
  rememberMe: boolean,
): void {
  if (typeof window === "undefined") return;
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  storage.setItem(AUTH_REMEMBER_KEY, String(rememberMe));
  other.removeItem(AUTH_TOKEN_KEY);
  other.removeItem(AUTH_USER_KEY);
  other.removeItem(AUTH_REMEMBER_KEY);
}

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_REMEMBER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_REMEMBER_KEY);
}

export function getStoredUser(): unknown {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function buildApiUrl(
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>
): string {
  if (!BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL no está configurado. Crea Front-End/.env con NEXT_PUBLIC_API_URL=http://localhost:8002",
    );
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${BASE_URL}${normalizedPath}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === "") return;
      if (Array.isArray(v)) {
        if (v.length === 0) return;
        v.forEach(item => {
          if (item !== undefined && item !== "") searchParams.append(k, String(item));
        });
      } else {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function handleResponse<T>(response: Response, responseType?: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("text/html")) {
      throw new Error(
        "Respuesta HTML inesperada del servidor. Verifica NEXT_PUBLIC_API_URL y que el backend esté disponible.",
      );
    }

    let errorData: unknown;
    try {
      errorData = text ? JSON.parse(text) : null;
    } catch {
      errorData = text;
    }

    const message =
      typeof errorData === "object" && errorData !== null && "detail" in errorData
        ? (errorData as { detail: string | { msg?: string }[] }).detail
        : typeof errorData === "string" && errorData
          ? errorData
          : response.statusText;

    const errMsg =
      typeof message === "string"
        ? message
        : Array.isArray(message)
          ? message.map((m: { msg?: string }) => m?.msg ?? "").join(", ")
          : "Request failed";
    throw new Error(errMsg || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (
    responseType === "blob" ||
    contentType?.includes("application/pdf") ||
    contentType?.includes("application/octet-stream")
  ) {
    return (await response.blob()) as unknown as T;
  }

  const text = await response.text();
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    return text as unknown as T;
  }
}

export const apiClient = {
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | string[] | undefined>,
    extraHeaders?: { responseType?: string; suppressErrorLog?: boolean } & Record<string, string | boolean | undefined>,
  ): Promise<T> {
    const url = buildApiUrl(path, params);
    const { responseType, suppressErrorLog, ...headersOnly } = extraHeaders || {};
    const headers: Record<string, string> = { ...getAuthHeaders() };
    Object.entries(headersOnly).forEach(([key, value]) => {
      if (typeof value === "string") headers[key] = value;
    });
    try {
      const response = await fetch(url, { method: "GET", headers });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      if (!suppressErrorLog) console.error(`GET ${url}:`, error);
      throw error;
    }
  },

  async post<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string> & { responseType?: string },
  ): Promise<T> {
    const { responseType, ...headersOnly } = headers || {};
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...headersOnly,
    };
    const url = buildApiUrl(path);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`POST ${url}:`, error);
      throw error;
    }
  },

  async put<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string> & { responseType?: string },
  ): Promise<T> {
    const { responseType, ...headersOnly } = headers || {};
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...headersOnly,
    };
    const url = buildApiUrl(path);
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`PUT ${url}:`, error);
      throw error;
    }
  },

  async patch<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string> & { responseType?: string },
  ): Promise<T> {
    const { responseType, ...headersOnly } = headers || {};
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...headersOnly,
    };
    const url = buildApiUrl(path);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`PATCH ${url}:`, error);
      throw error;
    }
  },

  async delete(path: string): Promise<void> {
    const url = buildApiUrl(path);
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) await handleResponse<never>(response);
    } catch (error) {
      console.error(`DELETE ${url}:`, error);
      throw error;
    }
  },
};
