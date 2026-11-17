interface StudentAvatarProps {
  name?: string;
  photoUrl?: string | null;
  className?: string;
}

export function StudentAvatar({ name, photoUrl, className = '' }: StudentAvatarProps) {
  return (
    <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl border border-slate-900/80 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name || 'Student'} className="w-full h-full object-cover rounded-xl" />
      ) : (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-900/80 flex items-center justify-center overflow-hidden bg-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900 mt-1">
            <path
              fillRule="evenodd"
              d="M12 2a5 5 0 100 10 5 5 0 000-10zm-7 18a7 7 0 0114 0H5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
