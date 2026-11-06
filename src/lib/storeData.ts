import type { Game } from "@/types/game";

export function validateAppDownloadUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com" || url.username || url.password ||
      !(url.pathname.startsWith("/file/d/") || (url.pathname === "/uc" && url.searchParams.has("id")) || (url.pathname === "/open" && url.searchParams.has("id")))) {
    throw new Error("PC app එකේ Google Drive file link එකක් ඇතුළත් කරන්න.");
  }
  return url.href;
}

export function normalizeGame(id: string, raw: unknown): Game | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const str = (key: string, alias?: string): string | null => {
    const value = data[key] ?? (alias ? data[alias] : undefined);
    return typeof value === "string" ? value : null;
  };
  const list = (key: string): string[] => Array.isArray(data[key]) ? (data[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
  const title = str("title", "name");
  if (!title) return null;
  return {
    id, title, description: str("description"), image_url: str("image_url", "imageUrl"),
    download_url: null, download_url_pro: null, price: Number(data.price) || 0,
    is_free: data.is_free !== false, mode: str("mode") || "offline", genre: str("genre"),
    developer: str("developer"), publisher: str("publisher"), release_date: str("release_date", "releaseDate"),
    min_os: str("min_os"), min_cpu: str("min_cpu"), min_ram: str("min_ram"), min_gpu: str("min_gpu"), min_storage: str("min_storage"),
    featured: data.featured === true, categories: list("categories"), screenshots: list("screenshots"), trailer_url: str("trailer_url", "trailerUrl"),
    created_at: str("created_at", "createdAt") || "", updated_at: str("updated_at", "updatedAt") || "",
  };
}
