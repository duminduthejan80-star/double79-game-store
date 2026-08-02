export const GAME_CATEGORIES = [
  "Action",
  "Open World",
  "Survival",
  "Racing",
  "Horror",
  "RPG",
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];
