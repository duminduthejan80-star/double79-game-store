// Auto-detect basic PC specs using browser APIs.
// Note: these are approximations capped by browser privacy limits.

export interface DetectedSpecs {
  ram: number; // GB (approx, capped by browser)
  cores: number;
  gpu: string;
  ramExact: boolean; // navigator.deviceMemory is rounded/capped
  detectedAt: number;
}

const detectGpu = (): string => {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "Unknown GPU";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) {
      const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
      if (renderer) return renderer;
    }
    const fallback = gl.getParameter(gl.RENDERER) as string;
    return fallback || "Unknown GPU";
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
