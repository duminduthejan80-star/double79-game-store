import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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

// Rough CPU/GPU tier scoring by family/series. Heuristic only.
const scoreCpu = (s: string): number => {
  if (!s) return 0;
  const t = s.toLowerCase();
  let base = 0;
  if (/i9|ryzen\s*9/.test(t)) base = 90;
  else if (/i7|ryzen\s*7/.test(t)) base = 75;
  else if (/i5|ryzen\s*5/.test(t)) base = 60;
  else if (/i3|ryzen\s*3/.test(t)) base = 40;
  else if (/pentium|celeron|athlon/.test(t)) base = 20;
  else base = 30;
  // generation bump (e.g. 12700, 5600)
  const gen = t.match(/(\d{4,5})/);
  if (gen) {
    const n = parseInt(gen[1], 10);
    if (n >= 10000) base += Math.min(20, Math.floor(n / 1000));
    else base += Math.min(15, Math.floor(n / 1000));
  }
  return base;
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

  // CPU
  if (req.min_cpu) {
    if (!profile.cpu) {
      items.push({ label: "CPU", required: req.min_cpu, yours: "Not set", status: "unknown" });
    } else {
      const reqScore = scoreCpu(req.min_cpu);
      const yourScore = scoreCpu(profile.cpu);
      items.push({
        label: "CPU",
        required: req.min_cpu,
        yours: profile.cpu,
        status: yourScore >= reqScore - 5 ? "pass" : "fail",
      });
    }
  }

  // GPU
  if (req.min_gpu) {
    if (!profile.gpu) {
      items.push({ label: "GPU", required: req.min_gpu, yours: "Not set", status: "unknown" });
    } else {
      const reqScore = scoreGpu(req.min_gpu);
      const yourScore = scoreGpu(profile.gpu);
      items.push({
        label: "GPU",
        required: req.min_gpu,
        yours: profile.gpu,
        status: yourScore >= reqScore - 5 ? "pass" : "fail",
      });
    }
  }

  let overall: CheckResult = "pass";
  if (items.some((i) => i.status === "fail")) overall = "fail";
  else if (items.length === 0 || items.every((i) => i.status === "unknown")) overall = "unknown";
  else if (items.some((i) => i.status === "unknown")) overall = "unknown";

  return { overall, items };
};
