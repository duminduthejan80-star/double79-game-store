export interface Game {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  download_url: string | null;
  price: number;
  is_free: boolean;
  mode: string; // 'online' | 'offline' | 'both'
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  min_os: string | null;
  min_cpu: string | null;
  min_ram: string | null;
  min_gpu: string | null;
  min_storage: string | null;
  featured: boolean;
  screenshots: string[];
  trailer_url: string | null;
  created_at: string;
  updated_at: string;
}

export type GameInput = Omit<Game, "id" | "created_at" | "updated_at">;
