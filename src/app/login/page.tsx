"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleGoogleLogin() {
    setSigning(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/");
    } catch (e: unknown) {
      setError("Erro ao entrar com Google. Tente novamente.");
      console.error(e);
    } finally {
      setSigning(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-red-900 to-red-800">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-red-800 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-950 rounded-full opacity-30 translate-x-1/3 translate-y-1/3" />

      <div className="relative bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-red-900 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-black tracking-tight">LC</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Ordem do Dia</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gabinete da Vereadora Liana Cirne</p>
          </div>
        </div>

        {error && (
          <p className="w-full text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={signing}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {signing ? "Entrando..." : "Entrar com Google"}
        </button>

        <p className="text-xs text-gray-400">Acesso restrito ao gabinete</p>
      </div>
    </div>
  );
}
