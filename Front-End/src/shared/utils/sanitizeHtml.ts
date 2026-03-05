import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "span", "div",
];

const ALLOWED_ATTR = ["class"];

/**
 * Sanitiza HTML usando DOMPurify antes de renderizarlo con dangerouslySetInnerHTML.
 * Solo permite etiquetas y atributos seguros (sin scripts, eventos ni URLs externas).
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style", "onclick", "onerror", "onload", "onmouseover"],
  });
}
