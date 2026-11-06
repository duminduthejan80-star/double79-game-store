import { useQuery, useMutation } from "@tanstack/react-query";
import { readGames, readGame } from "@/lib/firebaseStore";
export const useGames = () => useQuery({ queryKey: ["games"], queryFn: readGames, retry: false });
export const useGame = (id: string | undefined) => useQuery({ queryKey: ["game", id], enabled: !!id, retry: false, queryFn: () => id ? readGame(id) : Promise.resolve(null) });
// Retired website catalog editing; retained exports for unused legacy PC views.
export const useUpsertGame = () => useMutation({ mutationFn: async (_input: unknown) => { throw new Error("Catalog editing is managed in the PC app."); } });
export const useDeleteGame = () => useMutation({ mutationFn: async (_id: string) => { throw new Error("Catalog editing is managed in the PC app."); } });
