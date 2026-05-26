import { useState } from 'react';
import { Button } from './ui/button'; // Lovable shadcn button component

interface DownloadWidgetProps {
  gameUrl: string;
  gameTitle: string;
}

export default function DownloadWidget({ gameUrl, gameTitle }: DownloadWidgetProps) {
  const [progress, setProgress] = useState('0');
  const [speed, setSpeed] = useState('0');
  const [timeLeft, setTimeLeft] = useState('0');
  const [isDownloading, setIsDownloading] = useState(false);

  const startGofileDownload = () => {
    setIsDownloading(true);
    const startTime = Date.now();
    const xhr = new XMLHttpRequest();
    
    xhr.open('GET', gameUrl, true);
    xhr.responseType = 'blob'; 

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = ((event.loaded / event.total) * 100).toFixed(1);
        setProgress(percent);

        const duration = (Date.now() - startTime) / 1000;
        const speedBytes = duration > 0 ? event.loaded / duration : 0;
        const speedMB = (speedBytes / (1024 * 1024)).toFixed(2);
        setSpeed(speedMB);

        const remainingBytes = event.total - event.loaded;
        const remainingTime = speedBytes > 0 ? remainingBytes / speedBytes : 0;
        const mins = Math.floor(remainingTime / 60);
        const secs = Math.floor(remainingTime % 60);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `${gameTitle}.zip`;
        a.click();
        setIsDownloading(false);
        setProgress('0');
      }
    };

    xhr.onerror = () => {
      // CORS බ්ලොක් එකක් ආවොත් සිස්ටම් එක හිර නොවී නෝමල් විදිහට බ්‍රවුසර් එකෙන් ඕපන් කරනවා
      window.open(gameUrl, '_blank');
      setIsDownloading(false);
    };

    xhr.send();
  };

  return (
    <div className="w-full bg-slate-900/80 p-4 rounded-xl border border-slate-800 mt-4 backdrop-blur-sm">
      {!isDownloading ? (
        <Button 
          onClick={startGofileDownload} 
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-lg font-bold text-base hover:opacity-95 transition-all shadow-lg shadow-blue-500/20"
        >
          🎮 Download Game (Live Speed Progress)
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>Downloading files...</span>
            <span className="text-blue-400 font-mono font-bold text-sm">{progress}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Steam Style Live Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-1 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
            <div>Speed: <span className="text-slate-200 font-bold">{speed} MB/s</span></div>
            <div>Time Remaining: <span className="text-slate-200 font-bold">{timeLeft}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
