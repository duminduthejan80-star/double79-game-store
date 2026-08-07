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

// ---------- CPU scoring (brand agnostic) ----------
const cpuTier = (s: string): number | null => {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/ryzen\s*(threadripper)|threadripper|xeon\s*w|core\s*ultra\s*9/.test(t)) return 95;
  if (/\bi9\b|core\s*i9|ryzen\s*9/.test(t)) return 90;
  if (/core\s*ultra\s*7/.test(t)) return 82;
  if (/\bi7\b|core\s*i7|ryzen\s*7/.test(t)) return 75;
  if (/core\s*ultra\s*5/.test(t)) return 66;
  if (/\bi5\b|core\s*i5|ryzen\s*5/.test(t)) return 60;
  if (/\bi3\b|core\s*i3|ryzen\s*3/.test(t)) return 45;
  if (/\bxeon\b/.test(t)) return 55;
  if (/\bfx[-\s]?\d|\bfx\b/.test(t)) return 32;
  if (/phenom/.test(t)) return 26;
  if (/pentium/.test(t)) return 22;
  if (/\ba\d{1,2}[-\s]?\d{4}\b|\bapu\b/.test(t)) return 20;
  if (/athlon/.test(t)) return 18;
  if (/celeron|atom/.test(t)) return 12;
  if (/\bm[123]\b|apple\s*silicon/.test(t)) return 85;
  return null;
};

// Intel generation: i5-12400 -> 12, i5-2500 -> 2. AMD: Ryzen 5 5600 -> 5.
const cpuGeneration = (s: string): number => {
  const t = s.toLowerCase();
  const ryzen = t.match(/ryzen\s*\d\s*[-\s]?(\d{4,5})/);
  if (ryzen) {
    const n = ryzen[1];
    return parseInt(n.length >= 5 ? n.slice(0, 2) : n.slice(0, 1), 10);
  }
  const intel = t.match(/i[3579][-\s]?(\d{4,5})/);
  if (intel) {
    const n = intel[1];
    return parseInt(n.length >= 5 ? n.slice(0, 2) : n.slice(0, 1), 10);
  }
  const ultra = t.match(/ultra\s*\d\s*(\d{3})/);
  if (ultra) return 14;
  return 0;
};

const scoreCpu = (s: string): number => {
  const tier = cpuTier(s);
  if (tier === null) return 0;
  return tier * 4 + Math.min(20, cpuGeneration(s)) * 3;
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

// ---------- GPU scoring (any brand: NVIDIA / AMD / Intel / Apple) ----------
const scoreGpu = (s: string): number => {
  if (!s) return 0;
  const t = s.toLowerCase().replace(/\s+/g, " ");

  // NVIDIA RTX
  let m = t.match(/rtx\s*(\d{4})/);
  if (m) {
    const n = parseInt(m[1], 10);
    return 300 + Math.floor(n / 100) * 4 + (n % 100) * 1.2;
  }
  // NVIDIA GTX
  m = t.match(/gtx\s*(\d{3,4})/);
  if (m) {
    const n = parseInt(m[1], 10);
    const gen = n >= 1000 ? Math.floor(n / 100) : Math.floor(n / 100);
    const tier = n % 100;
    return 150 + gen * 4 + tier * 1.0;
  }
  // NVIDIA GT / MX (entry level)
  m = t.match(/\b(?:gt|mx)\s*(\d{3,4})/);
  if (m) {
    const n = parseInt(m[1], 10);
    return 60 + Math.floor(n / 100) * 3 + (n % 100) * 0.5;
  }
  // AMD Radeon RX
  m = t.match(/rx\s*(\d{3,4})\s*(xtx|xt)?/);
  if (m) {
    const n = parseInt(m[1], 10);
    const bonus = m[2] ? (m[2] === "xtx" ? 30 : 15) : 0;
    if (n >= 1000) return 300 + Math.floor(n / 100) * 2.5 + (n % 100) * 1.2 + bonus;
    return 150 + n * 0.25 + bonus;
  }
  if (/vega/.test(t)) return 320;
  // Intel Arc
  m = t.match(/arc\s*a?(\d{3,4})/);
  if (m) return 200 + parseInt(m[1], 10) * 0.15;
  // Apple silicon
  if (/apple\s*m[1-4]/.test(t)) return 350;
  if (/radeon\s*(hd|r[579])/.test(t)) return 90;
  if (/radeon/.test(t)) return 200;
  if (/geforce/.test(t)) return 150;
  if (/(intel).*(hd|uhd|iris)|uhd graphics|hd graphics/.test(t)) return 70;
  return 0; // unknown brand/model
};

// VRAM in GB, e.g. "GTX 1050 2GB", "4 GB VRAM"
const gpuVram = (s: string): number | null => {
  if (!s) return null;
  const m = s.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(gb|mb)\b/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2] === "mb" ? v / 1024 : v;
};

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

  // Storage — intentionally not checked (browsers can't read disk space).

  // CPU — brand agnostic tier + generation; fall back to core count.
  if (req.min_cpu) {
    if (!profile.cpu) {
      items.push({ label: "CPU", required: req.min_cpu, yours: "Not set", status: "unknown" });
    } else {
      const reqScore = scoreCpu(req.min_cpu);
      const yourScore = scoreCpu(profile.cpu);

      let status: CheckResult;
      if (reqScore > 0 && yourScore > 0) {
        status = yourScore >= reqScore ? "pass" : "fail";
      } else {
        const reqCores = extractCores(req.min_cpu) ?? 2;
        const yourCores =
          extractCores(profile.cpu) ??
          (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0);
        status = yourCores ? (yourCores >= reqCores ? "pass" : "fail") : "unknown";
      }

      items.push({ label: "CPU", required: req.min_cpu, yours: profile.cpu, status });
    }
  }

  // GPU — compare model score across any brand, then VRAM if both sides state it.
  if (req.min_gpu) {
    if (!profile.gpu) {
      items.push({ label: "GPU", required: req.min_gpu, yours: "Not set", status: "unknown" });
    } else {
      const cleanedYours = cleanGpuName(profile.gpu);
      const reqScore = scoreGpu(req.min_gpu);
      const yourScore = scoreGpu(cleanedYours);

      let status: CheckResult;
      if (reqScore > 0 && yourScore > 0) {
        status = yourScore >= reqScore ? "pass" : "fail";
      } else {
        status = "unknown";
      }

      // VRAM check (e.g. requirement "GTX 1050 2GB" vs your "GTX 1650 4GB")
      const reqVram = gpuVram(req.min_gpu);
      const yourVram = gpuVram(cleanedYours);
      if (status === "pass" && reqVram && yourVram && yourVram < reqVram) {
        status = "fail";
      }

      items.push({
        label: "GPU",
        required: req.min_gpu,
        yours: yourVram ? `${cleanedYours}` : cleanedYours,
        status,
      });
    }
  }

  let overall: CheckResult = "pass";
  if (items.some((i) => i.status === "fail")) overall = "fail";
  else if (items.length === 0 || items.some((i) => i.status === "unknown")) overall = "unknown";

  return { overall, items };
};

