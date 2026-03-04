function resolveBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!configured) return "";

  const isAbsolute = /^https?:\/\//i.test(configured);
  if (!isAbsolute) return configured.replace(/\/$/, "");

  if (typeof window === "undefined") return configured;

  try {
    const parsed = new URL(configured);
    const isApiLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0";
    const browserHost = window.location.hostname;
    const isBrowserLocalHost =
      browserHost === "localhost" ||
      browserHost === "127.0.0.1" ||
      browserHost === "0.0.0.0";

    if (isApiLocalHost && !isBrowserLocalHost) {
      parsed.hostname = browserHost;
      return parsed.toString().replace(/\/$/, "");
    }

    if (parsed.hostname === "0.0.0.0") {
      parsed.hostname = browserHost === "0.0.0.0" ? "127.0.0.1" : browserHost;
      return parsed.toString().replace(/\/$/, "");
    }

    return configured.replace(/\/$/, "");
  } catch {
    return configured.replace(/\/$/, "");
  }
}

function buildFallbackUrls(url: string): string[] {
  if (!/^https?:\/\//i.test(url)) return [url];

  const fallbackUrls = [url];
  try {
    const parsed = new URL(url);
    const originalHost = parsed.hostname;
    const browserHost = typeof window !== "undefined" ? window.location.hostname : "";

    const candidates = [browserHost, "127.0.0.1", "localhost"]
      .filter(Boolean)
      .filter((host) => host !== originalHost);

    for (const host of candidates) {
      const candidate = new URL(parsed.toString());
      candidate.hostname = host;
      fallbackUrls.push(candidate.toString());
    }
  } catch {
    return [url];
  }

  return [...new Set(fallbackUrls)];
}

async function fetchWithFallback(
  method: string,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const candidates = buildFallbackUrls(url);
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidateUrl = candidates[index];
    try {
      return await fetch(candidateUrl, init);
    } catch (error) {
      lastError = error;
      if (index === candidates.length - 1) {
        throw error;
      }
      console.warn(`Fetch retry at ${method} ${candidateUrl} failed, trying next host...`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Fetch failed at ${method} ${url}`);
}

const BASE_URL = resolveBaseUrl();
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

async function handleResponse<T>(
  response: Response,
  responseType?: string,
): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let errorData: unknown;
    try {
      errorData = text ? JSON.parse(text) : null;
    } catch {
      errorData = text;
    }

    const message =
      typeof errorData === "object" &&
      errorData !== null &&
      "detail" in errorData
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
    params?: Record<string, string | number | undefined>,
    extraHeaders?: Record<string, string> & { responseType?: string; suppressErrorLog?: boolean },
  ): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    let url = BASE_URL ? `${BASE_URL}${normalizedPath}` : normalizedPath;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") searchParams.set(k, String(v));
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    const { responseType, suppressErrorLog, ...headersOnly } = extraHeaders || {};
    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      ...headersOnly,
    };

    try {
      const response = await fetchWithFallback("GET", url, {
        method: "GET",
        headers,
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      if (!suppressErrorLog) {
        console.error(`Fetch error at GET ${url}:`, error);
      }
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
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = BASE_URL ? `${BASE_URL}${normalizedPath}` : normalizedPath;
    try {
      const response = await fetchWithFallback("POST", url, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`Fetch error at POST ${url}:`, error);
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
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = BASE_URL ? `${BASE_URL}${normalizedPath}` : normalizedPath;
    try {
      const response = await fetchWithFallback("PUT", url, {
        method: "PUT",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`Fetch error at PUT ${url}:`, error);
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
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = BASE_URL ? `${BASE_URL}${normalizedPath}` : normalizedPath;
    try {
      const response = await fetchWithFallback("PATCH", url, {
        method: "PATCH",
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
      return await handleResponse<T>(response, responseType);
    } catch (error) {
      console.error(`Fetch error at PATCH ${url}:`, error);
      throw error;
    }
  },

  async delete(path: string): Promise<void> {
    const headers = getAuthHeaders();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = BASE_URL ? `${BASE_URL}${normalizedPath}` : normalizedPath;
    try {
      const response = await fetchWithFallback("DELETE", url, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) await handleResponse<never>(response);
    } catch (error) {
      console.error(`Fetch error at DELETE ${url}:`, error);
      throw error;
    }
  },
};
