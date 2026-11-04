import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, ShieldAlert } from 'lucide-react';

interface PasswordGateProps {
  onUnlock: () => void;
}

const CORRECT_PASSWORD = 'Alvik711';

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(true);
      setErrorMessage('Masukkan password untuk melanjutkan.');
      return;
    }

    if (password === CORRECT_PASSWORD) {
      setError(false);
      try {
        sessionStorage.setItem('pm2026_auth', 'authenticated');
      } catch (err) {
        console.warn('sessionStorage not available', err);
      }
      onUnlock();
    } else {
      setError(true);
      setErrorMessage('Password salah! Silakan coba lagi.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8ec] flex items-center justify-center p-4">
      {/* Decorative background glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[450px] h-[450px] rounded-full bg-[#fcc844]/20 blur-3xl -translate-y-12" />
        <div className="w-[350px] h-[350px] rounded-full bg-[#85362f]/10 blur-3xl translate-y-16" />
      </div>

      <div className="relative w-full max-w-sm bg-white border border-[#e2e0cf] rounded-2xl shadow-xl overflow-hidden p-6 sm:p-7">
        {/* Top Logo Zone */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 mb-3 flex items-center justify-center">
            <img
              src="/assets/aistudio/LED_Template__1__3621e6db.png"
              alt="Pasar Malam 2026 Logo"
              className="h-16 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="font-extrabold text-lg sm:text-xl text-stone-900 tracking-tight">
            Pasar Malam 2026
          </h1>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">
            Gate Scanner & Check-in Console
          </p>
        </div>

        {/* Security Shield Banner */}
        

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
              <span>Password Akses</span>
              <span className="text-[10px] text-stone-400 font-normal">Wajib diisi</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                autoFocus
                placeholder="Masukkan password..."
                className={`w-full bg-[#f8f8ec] border ${
                  error ? 'border-[#85362f] ring-1 ring-[#85362f]' : 'border-[#e2e0cf]'
                } rounded-xl pl-9.5 pr-10 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#85362f] focus:bg-white transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 transition-colors"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#85362f]">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#85362f] hover:bg-[#6e2b25] active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Buka Akses Aplikasi</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e2e0cf] text-center">
          <p className="text-[11px] text-stone-400 font-medium">
            Pasar Malam 2026 - SIS X PPI Stockholm
          </p>
        </div>
      </div>
    </div>
  );
};
