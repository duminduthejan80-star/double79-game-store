import { useQuery } from "@tanstack/react-query";
import { readAppDownloadUrl } from "@/lib/firebaseStore";
export const useAppDownload = () => useQuery({ queryKey: ["app-download-url"], queryFn: readAppDownloadUrl, retry: false, staleTime: 30_000 });
