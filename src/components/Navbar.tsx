import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Store, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppDownloadDialog from "@/components/AppDownloadDialog";
import logo from "@/assets/logo.png";
export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <Link to="/home" className="flex items-center gap-3 min-w-0"><img src={logo} alt="" className="h-10 w-10 rounded-lg shrink-0" /><span className="text-sm font-bold text-foreground">DOUBLE79<span className="block text-xs font-normal text-muted-foreground">Game Store</span></span></Link>
      <nav className="flex items-center gap-2" aria-label="Main navigation">
        <Button variant="ghost" asChild><Link to="/home"><Store className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Store</span></Link></Button>
        <Button variant="ghost" size="icon" asChild><a href="https://www.youtube.com/channel/UCeUlnTEhYCeZGm8xL9NMZMQ" target="_blank" rel="noopener noreferrer" aria-label="YouTube channel"><Youtube className="h-5 w-5" /></a></Button>
        <Button onClick={() => setOpen(true)}><Download className="h-4 w-4 mr-2" /><span>Download App</span></Button>
      </nav>
    </div><AppDownloadDialog open={open} onOpenChange={setOpen} />
  </header>;
}
