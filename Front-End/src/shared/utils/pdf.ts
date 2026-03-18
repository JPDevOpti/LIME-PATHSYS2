import { buildApiUrl, getAuthToken } from "@/shared/api/client";

export function openCasePdf(caseId: string): void {
  const token = getAuthToken();
  if (!token) throw new Error("No hay sesion activa.");

  const url = buildApiUrl(`/api/v1/cases/${encodeURIComponent(caseId)}/pdf`, {
    token,
    ts: Date.now(),
  });

  window.open(url, "_blank", "noopener,noreferrer");
}
