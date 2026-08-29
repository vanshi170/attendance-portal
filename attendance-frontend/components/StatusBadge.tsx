import { Check, Clock, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function StatusBadge({ status }: { status: 'present' | 'absent' | 'late' }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit",
      status === 'present' && "bg-[#16A34A]/10 text-[#16A34A]",
      status === 'absent' && "bg-[#DC2626]/10 text-[#DC2626]",
      status === 'late' && "bg-hot-pink/10 text-hot-pink"
    )}>
      {status === 'present' && <Check className="w-3.5 h-3.5" />}
      {status === 'absent' && <X className="w-3.5 h-3.5" />}
      {status === 'late' && <Clock className="w-3.5 h-3.5" />}
      <span className="capitalize">{status}</span>
    </div>
  );
}
