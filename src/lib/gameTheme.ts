// Dynamic theme presets for game pages.
// Each preset overrides core HSL design tokens on :root.

export type GameTheme = {
  name: string;
  primary: string; // HSL "h s% l%"
  primaryGlow: string;
  accent: string;
  ring: string;
  glowColor: string; // for shadow-glow rgba/hsl
};

export const DEFAULT_THEME: GameTheme = {
  name: "double79",
  primary: "0 85% 55%",
  primaryGlow: "10 95% 65%",
  accent: "0 80% 50%",
  ring: "0 90% 55%",
  glowColor: "0 90% 55%",
};

const THEMES: Array<{ match: RegExp; theme: GameTheme }> = [
  {
    match: /spider[\s-]?man/i,
    theme: {
      name: "spiderman",
      primary: "355 85% 52%",
      primaryGlow: "355 95% 65%",
      accent: "215 95% 55%",
      ring: "355 90% 55%",
      glowColor: "355 90% 55%",
    },
  },
  {
    match: /last of us/i,
    theme: {
      name: "tlou",
      primary: "95 35% 35%",
      primaryGlow: "95 45% 50%",
      accent: "85 40% 45%",
      ring: "95 40% 40%",
      glowColor: "95 40% 40%",
    },
  },
  {
    match: /assassin'?s? creed/i,
    theme: {
      name: "ac",
      primary: "0 0% 88%",
      primaryGlow: "0 0% 98%",
      accent: "210 8% 60%",
      ring: "0 0% 90%",
      glowColor: "0 0% 80%",
    },
  },
  {
    match: /god of war/i,
    theme: {
      name: "gow",
      primary: "20 90% 50%",
      primaryGlow: "30 95% 60%",
      accent: "15 85% 45%",
      ring: "20 90% 50%",
      glowColor: "20 90% 50%",
    },
  },
  {
    match: /cyberpunk/i,
    theme: {
      name: "cyberpunk",
      primary: "55 100% 55%",
      primaryGlow: "320 95% 60%",
      accent: "180 95% 50%",
      ring: "55 100% 55%",
      glowColor: "55 100% 55%",
    },
  },
  {
    match: /witcher/i,
    theme: {
      name: "witcher",
      primary: "45 90% 50%",
      primaryGlow: "40 95% 60%",
      accent: "30 70% 45%",
      ring: "45 90% 50%",
      glowColor: "45 90% 50%",
    },
  },
];

export const pickTheme = (title: string | null | undefined): GameTheme => {
  if (!title) return DEFAULT_THEME;
  for (const { match, theme } of THEMES) if (match.test(title)) return theme;
  return DEFAULT_THEME;
};

const VARS: Array<[keyof GameTheme, string]> = [
  ["primary", "--primary"],
  ["primaryGlow", "--primary-glow"],
  ["accent", "--accent"],
  ["ring", "--ring"],
];

export const applyTheme = (theme: GameTheme) => {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  for (const [key, cssVar] of VARS) root.style.setProperty(cssVar, theme[key]);
  root.style.setProperty("--shadow-glow", `0 0 30px hsl(${theme.glowColor} / 0.45)`);
  root.dataset.gameTheme = theme.name;
};

export const resetTheme = () => {
  const root = document.documentElement;
  for (const [, cssVar] of VARS) root.style.removeProperty(cssVar);
  root.style.removeProperty("--shadow-glow");
  delete root.dataset.gameTheme;
};
