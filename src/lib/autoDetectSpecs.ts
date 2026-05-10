// Auto-detect basic PC specs using browser APIs.
// Note: these are approximations capped by browser privacy limits.

export interface DetectedSpecs {
  ram: number; // GB (approx, capped by browser)
  cores: number;
  gpu: string;
  ramExact: boolean; // navigator.deviceMemory is rounded/capped
  detectedAt: number;
}

// Strip browser/driver wrappers like "ANGLE (NVIDIA, NVIDIA GeForce GTX 750 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)"
// down to just the human-readable model: "NVIDIA GeForce GTX 750 Ti".
export const cleanGpuName = (raw: string): string => {
  if (!raw) return "";
  let s = raw.trim();

  // Pull the inner contents of an ANGLE(...) wrapper if present.
  const angle = s.match(/^ANGLE\s*\(([^]*)\)\s*$/i);
  if (angle) s = angle[1];

  // ANGLE often gives "Vendor, Model Direct3D11 ..., D3D11". Take the middle segment.
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // Prefer the longest segment that mentions GeForce/Radeon/Arc/Intel — that's the model.
    const model = parts.find((p) => /(geforce|radeon|arc|intel)/i.test(p)) ?? parts[1];
    s = model;
  }

  // Remove driver/API noise.
  s = s
    .replace(/\bDirect3D\d*\b/gi, "")
    .replace(/\bD3D\d*\b/gi, "")
    .replace(/\bvs_\d+_\d+\b/gi, "")
    .replace(/\bps_\d+_\d+\b/gi, "")
    .replace(/\bOpenGL\s*\d*(?:\.\d+)?\b/gi, "")
    .replace(/\bMetal\b/gi, "")
    .replace(/\bVulkan\b/gi, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return s || raw.trim();
};

const detectGpu = (): string => {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "Unknown GPU";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    let raw = "";
    if (dbg) {
      raw = (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) || "";
    }
    if (!raw) raw = (gl.getParameter(gl.RENDERER) as string) || "";
    const cleaned = cleanGpuName(raw);
    return cleaned || "Unknown GPU";
  } catch {
    return "Unknown GPU";
  }
};

export const detectSpecs = (): DetectedSpecs | null => {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ram = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 0;
  const cores = nav.hardwareConcurrency || 0;
  const gpu = detectGpu();
  if (!ram && !cores && (!gpu || gpu === "Unknown GPU")) return null;
  return {
    ram,
    cores,
    gpu,
    ramExact: false,
    detectedAt: Date.now(),
  };
};
