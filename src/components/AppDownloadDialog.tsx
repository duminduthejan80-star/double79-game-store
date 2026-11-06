import { Download, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppDownload } from "@/hooks/useAppDownload";
import logo from "@/assets/logo.png";
export default function AppDownloadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: url, isLoading, error } = useAppDownload();
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
    <DialogHeader>
      <img src={logo} alt="Double79" className="h-20 w-20 rounded-lg object-cover mb-4" />
      <DialogTitle className="text-2xl">Double79 Game Store</DialogTitle>
      <DialogDescription lang="si" className="pt-3 text-base leading-7">Game download කරන්න සහ game play කරන්න Double79 Game Store app එක download කරගන්න.</DialogDescription>
    </DialogHeader>
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Monitor className="h-4 w-4" /> Windows PC</div>
    {url ? <Button asChild size="lg" className="w-full"><a href={url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-2" />Download App</a></Button> : <>
      <Button size="lg" className="w-full" disabled><Download className="h-4 w-4 mr-2" />{isLoading ? "Loading…" : "Download App"}</Button>
      <p role={error ? "alert" : "status"} lang="si" className="text-sm text-muted-foreground">{error ? "App download link එක තවම සම්බන්ධ කර නැහැ." : "App download link එක ළඟදීම එක් කරනු ඇත."}</p>
    </>}
  </DialogContent></Dialog>;
}
