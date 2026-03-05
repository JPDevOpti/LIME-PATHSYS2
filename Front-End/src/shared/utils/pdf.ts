import { apiClient } from "@/shared/api/client";

export async function openCasePdf(caseId: string): Promise<void> {
  const pdfBlob = await apiClient.get<Blob>(
    `/api/v1/cases/${encodeURIComponent(caseId)}/pdf`,
    undefined,
    { responseType: "blob", suppressErrorLog: true },
  );

  const blobUrl = URL.createObjectURL(pdfBlob);
  const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");

  if (!opened) {
    window.location.assign(blobUrl);
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}