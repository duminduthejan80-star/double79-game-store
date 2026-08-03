export const GAME_CATEGORIES = [
  "Action",
  "Adventure",
  "Anime",
  "Building",
  "First-person Shooter",
  "Horror",
  "Indie",
  "Multiplayer",
  "Open World",
  "Racing",
  "Role-playing Game",
  "Sci-fi",
  "Shooters",
  "Simulation",
  "Sports",
  "Strategy",
  "Survival",
  "Virtual Reality",
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];
