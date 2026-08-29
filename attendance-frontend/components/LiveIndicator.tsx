import { useEffect, useState } from 'react';

export function LiveIndicator({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${m}:${s}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/50 border border-thistle rounded-full">
      <div className="w-2 h-2 rounded-full bg-hot-pink animate-pulse" />
      <span className="text-xs font-semibold text-black tracking-wider">LIVE</span>
      <span className="text-xs font-plex-mono text-gray-800">{elapsed}</span>
    </div>
  );
}
