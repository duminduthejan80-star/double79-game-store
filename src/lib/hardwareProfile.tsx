import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { cleanGpuName } from "@/lib/autoDetectSpecs";

export interface HardwareProfile {
  cpu: string;
  gpu: string;
  ram: number; // GB
  storage: number; // GB free
}

const STORAGE_KEY = "double79:hardware-profile";

const defaultProfile: HardwareProfile = {
  cpu: "",
  gpu: "",
  ram: 0,
  storage: 0,
};

type Ctx = {
  profile: HardwareProfile;
  setProfile: (p: HardwareProfile) => void;
  hasProfile: boolean;
};

const HardwareContext = createContext<Ctx | null>(null);

export const HardwareProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfileState] = useState<HardwareProfile>(defaultProfile);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfileState({ ...defaultProfile, ...JSON.parse(raw) });
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setProfileState({ ...defaultProfile, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<HardwareProfile>;
      if (ce.detail) setProfileState(ce.detail);
    };
    window.addEventListener("hardware-profile-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hardware-profile-change", onCustom as EventListener);
    };
  }, []);

  const setProfile = (p: HardwareProfile) => {
    setProfileState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
    window.dispatchEvent(new CustomEvent("hardware-profile-change", { detail: p }));
  };

  const hasProfile = !!(profile.cpu || profile.gpu || profile.ram);

  return (
    <HardwareContext.Provider value={{ profile, setProfile, hasProfile }}>{children}</HardwareContext.Provider>
  );
};

export const useHardwareProfile = () => {
  const ctx = useContext(HardwareContext);
  if (!ctx) throw new Error("useHardwareProfile must be used within HardwareProfileProvider");
  return ctx;
};

// ---- Comparison logic ----

const extractFirstNumber = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

// Parse a size string like "8 GB", "512MB", "1.5 TB", "256" (assumed GB if bare).
// Returns megabytes.
const parseSizeToMB = (s: string | null | undefined, assumedUnit: "GB" | "MB" = "GB"): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb|kb|b)?/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = (m[2] || assumedUnit).toLowerCase();
  switch (unit) {
    case "tb": return value * 1024 * 1024;
    case "gb": return value * 1024;
    case "mb": return value;
    case "kb": return value / 1024;
    case "b":  return value / (1024 * 1024);
    default:   return value * 1024; // assume GB
  }
};

const formatMB = (mb: number): string => {
  if (mb >= 1024 * 1024) return `${(mb / 1024 / 1024).toFixed(1)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${Math.round(mb)} MB`;
};

// CPU tier hierarchy.
// Intel: i9 > i7 > i5 > i3 > Pentium > Celeron
// AMD:   Ryzen 9 > Ryzen 7 > Ryzen 5 > Ryzen 3 > FX > Athlon
const cpuTier = (s: string): number | null => {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/\bi9\b|ryzen\s*9|threadripper/.test(t)) return 90;
  if (/\bi7\b|ryzen\s*7/.test(t)) return 75;
  if (/\bi5\b|ryzen\s*5/.test(t)) return 60;
  if (/\bi3\b|ryzen\s*3/.test(t)) return 45;
  if (/\bfx[-\s]?\d/.test(t) || /\bfx\b/.test(t)) return 35;
  if (/pentium/.test(t)) return 25;
  if (/athlon/.test(t)) return 20;
  if (/celeron/.test(t)) return 15;
  return null; // Unknown family — caller should fall back to core count
};

const scoreCpu = (s: string): number => {
  const tier = cpuTier(s);
  if (tier === null) return 0;
  // small generation bump so newer chips edge out older ones in the same family
  const gen = s.toLowerCase().match(/[-\s](\d{4,5})/);
  let bonus = 0;
  if (gen) {
    const n = parseInt(gen[1], 10);
    bonus = n >= 10000 ? Math.min(8, Math.floor(n / 2000)) : Math.min(6, Math.floor(n / 1500));
  }
  return tier + bonus;
};

// Extract a core count from strings like "8-core CPU", "Quad-core", "2 cores".
const extractCores = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const t = s.toLowerCase();
  const wordMap: Record<string, number> = { dual: 2, quad: 4, hexa: 6, octa: 8, deca: 10 };
  for (const [k, v] of Object.entries(wordMap)) {
    if (t.includes(`${k}-core`) || t.includes(`${k} core`)) return v;
  }
  const m = t.match(/(\d+)\s*[-\s]?cores?/);
  if (m) return parseInt(m[1], 10);
  return null;
};

const scoreGpu = (s: string): number => {
  if (!s) return 0;
  const t = s.toLowerCase();
  // NVIDIA RTX/GTX
  let m = t.match(/rtx\s*(\d{3,4})/);
  if (m) return 60 + Math.min(40, parseInt(m[1], 10) / 50);
  m = t.match(/gtx\s*(\d{3,4})/);
  if (m) return 30 + Math.min(30, parseInt(m[1], 10) / 50);
  // AMD RX
  m = t.match(/rx\s*(\d{3,4})/);
  if (m) return 40 + Math.min(40, parseInt(m[1], 10) / 50);
  // Intel Arc
  m = t.match(/arc\s*a?(\d{3,4})/);
  if (m) return 35 + Math.min(30, parseInt(m[1], 10) / 50);
  if (/intel.*(hd|uhd|iris)/.test(t)) return 15;
  if (/radeon/.test(t)) return 35;
  return 25;
};

// Identify a GPU family keyword shared between user & required strings.
const gpuFamily = (s: string): string | null => {
  const t = (s || "").toLowerCase();
  if (/\brtx\b/.test(t)) return "rtx";
  if (/\bgtx\b/.test(t)) return "gtx";
  if (/\brx\s*\d/.test(t)) return "rx";
  if (/\barc\b/.test(t)) return "arc";
  if (/radeon/.test(t)) return "radeon";
  if (/geforce/.test(t)) return "geforce";
  if (/intel/.test(t)) return "intel";
  return null;
};

// Did we actually find a model number to compare against?
const hasGpuModelNumber = (s: string): boolean =>
  /(rtx|gtx|rx|arc\s*a?)\s*\d{3,4}/i.test(s || "");

export type CheckResult = "pass" | "fail" | "unknown";

export interface CheckItem {
  label: string;
  required: string;
  yours: string;
  status: CheckResult;
}

export interface CompatibilityReport {
  overall: CheckResult;
  items: CheckItem[];
}

interface GameRequirements {
  min_cpu: string | null;
  min_gpu: string | null;
  min_ram: string | null;
  min_storage: string | null;
}

export const compareSpecs = (
  profile: HardwareProfile,
  req: GameRequirements,
): CompatibilityReport => {
  const items: CheckItem[] = [];

  // RAM — normalize everything to MB before comparing.
  // Bare numbers in the requirements string are assumed to be GB (typical for PC specs).
  if (req.min_ram) {
    const requiredMB = parseSizeToMB(req.min_ram, "GB") ?? 0;
    const yoursMB = profile.ram ? profile.ram * 1024 : 0; // profile.ram is GB
    if (!yoursMB) {
      items.push({ label: "RAM", required: formatMB(requiredMB), yours: "Not set", status: "unknown" });
    } else {
      items.push({
        label: "RAM",
        required: formatMB(requiredMB),
        yours: formatMB(yoursMB),
        status: yoursMB >= requiredMB ? "pass" : "fail",
      });
    }
  }

  // Storage — normalize to MB. If the user hasn't set storage, treat as "likely OK"
  // rather than failing/blocking the overall verdict (browsers can't reliably scan disks).
  if (req.min_storage) {
    const requiredMB = parseSizeToMB(req.min_storage, "GB") ?? 0;
    const yoursMB = profile.storage ? profile.storage * 1024 : 0;
    if (!yoursMB) {
      items.push({
        label: "Storage",
        required: formatMB(requiredMB),
        yours: "Browser can't scan disk",
        status: "pass",
      });
    } else {
      items.push({
        label: "Storage",
        required: formatMB(requiredMB),
        yours: `${formatMB(yoursMB)} free`,
        status: yoursMB >= requiredMB ? "pass" : "fail",
      });
    }
  }

  // CPU — try tier hierarchy first; fall back to core count if either side is unrecognized.
  if (req.min_cpu) {
    if (!profile.cpu) {
      items.push({ label: "CPU", required: req.min_cpu, yours: "Not set", status: "unknown" });
    } else {
      const reqTier = cpuTier(req.min_cpu);
      const yourTier = cpuTier(profile.cpu);

      let status: CheckResult;
      if (reqTier !== null && yourTier !== null) {
        // Both identifiable → compare full scores (tier + small generation bonus)
        status = scoreCpu(profile.cpu) >= scoreCpu(req.min_cpu) ? "pass" : "fail";
      } else {
        // Fall back to core count (from string or detected hardwareConcurrency)
        const reqCores = extractCores(req.min_cpu) ?? 2;
        const yourCores =
          extractCores(profile.cpu) ??
          (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0);
        status = yourCores && yourCores >= reqCores ? "pass" : "unknown";
      }

      items.push({
        label: "CPU",
        required: req.min_cpu,
        yours: profile.cpu,
        status,
      });
    }
  }

  // GPU
  if (req.min_gpu) {
    if (!profile.gpu) {
      items.push({ label: "GPU", required: req.min_gpu, yours: "Not set", status: "unknown" });
    } else {
      const cleanedYours = cleanGpuName(profile.gpu);
      const reqScore = scoreGpu(req.min_gpu);
      const yourScore = scoreGpu(cleanedYours);
      const sameFamily =
        gpuFamily(cleanedYours) && gpuFamily(cleanedYours) === gpuFamily(req.min_gpu);
      const canCompareExact = hasGpuModelNumber(cleanedYours) && hasGpuModelNumber(req.min_gpu);

      let status: CheckResult;
      if (yourScore >= reqScore && canCompareExact) {
        status = "pass";
      } else if (!canCompareExact && sameFamily) {
        // e.g. user has "GTX" something, requirement is "GTX" something — can't be exact, warn yellow.
        status = "unknown";
      } else if (yourScore >= reqScore) {
        status = "pass";
      } else if (sameFamily) {
        // Lower in same family — still warn instead of hard fail.
        status = "unknown";
      } else {
        status = "fail";
      }

      items.push({
        label: "GPU",
        required: req.min_gpu,
        yours: cleanedYours,
        status,
      });
    }
  }

  let overall: CheckResult = "pass";
  if (items.some((i) => i.status === "fail")) overall = "fail";
  else if (items.length === 0 || items.every((i) => i.status === "unknown")) overall = "unknown";
  else if (items.some((i) => i.status === "unknown")) overall = "unknown";

  return { overall, items };
};
