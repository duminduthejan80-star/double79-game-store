import { describe, expect, it } from "vitest";
import { normalizeGame, validateAppDownloadUrl } from "@/lib/storeData";
describe("PC app download URL", () => {
  it("accepts a Google Drive app file", () => expect(validateAppDownloadUrl("https://drive.google.com/file/d/app-file/view")).toBe("https://drive.google.com/file/d/app-file/view"));
  it("rejects non-Drive download destinations", () => expect(() => validateAppDownloadUrl("https://example.com/app.exe")).toThrow());
  it("rejects insecure Drive URLs", () => expect(() => validateAppDownloadUrl("http://drive.google.com/file/d/app/view")).toThrow());
  it("keeps an unset app URL unavailable", () => expect(validateAppDownloadUrl(null)).toBe(""));
});
describe("Firebase catalog", () => {
  it("maps existing app records without exposing game download links", () => {
    const game = normalizeGame("g1", { name: "Valheim", imageUrl: "cover.jpg", download_url: "https://gofile.io/d/private", download_url_pro: "private", screenshots: ["screenshot.jpg", 7] });
    expect(game?.title).toBe("Valheim"); expect(game?.image_url).toBe("cover.jpg"); expect(game?.download_url).toBeNull(); expect(game?.download_url_pro).toBeNull(); expect(game?.screenshots).toEqual(["screenshot.jpg"]);
  });
});
