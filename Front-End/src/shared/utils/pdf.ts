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
    // Fallback: force download/open via anchor tag without leaving the page
    const a = document.createElement("a");
    a.href = blobUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}