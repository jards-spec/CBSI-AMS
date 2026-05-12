import React, { useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  warningTime?: number;
}

const SessionTimeoutWarning: React.FC<Props> = ({ warningTime = 5 * 60 * 1000 }) => {
  const { getTimeRemaining, logout, updateActivityTime } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const checkTimeout = () => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= warningTime && remaining > 0) {
        setShowWarning(true);
      } else if (remaining === 0) {
        setShowWarning(false);
        logout();
      } else {
        setShowWarning(false);
      }
    };

    checkTimeout();
    const interval = setInterval(checkTimeout, 1000);

    return () => clearInterval(interval);
  }, [getTimeRemaining, warningTime, logout]);

  const handleStayLoggedIn = () => {
    updateActivityTime();
    setShowWarning(false);
  };

  const handleLogout = () => {
    logout();
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-orange-500/30 bg-[#0f121d] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
            <Clock className="text-orange-500" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">
              Session Expiring Soon
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Security Timeout Warning
            </p>
          </div>
        </div>

        <div className="mb-8 text-center">
          <p className="text-sm text-slate-400 mb-4">
            Your session will automatically expire due to inactivity.
          </p>
          
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-6 mb-4">
            <div className="text-5xl font-black text-orange-500 font-mono">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mt-2">
              Time Remaining
            </p>
          </div>

          <p className="text-[10px] text-slate-500">
            After timeout, you will need to log in again.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={14} className="inline mr-2" />
            Log Out Now
          </button>
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 rounded-2xl bg-orange-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-orange-950/40 transition-all hover:bg-orange-700 active:scale-95"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;