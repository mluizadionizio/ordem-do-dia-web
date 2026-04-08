"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="bg-red-900 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
          <div className="bg-white text-red-900 rounded-lg w-8 h-8 flex items-center justify-center font-black text-sm">
            LC
          </div>
          <span className="font-bold text-base tracking-tight">Ordem do Dia</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-red-200 hidden sm:block">
            {user?.displayName ?? user?.email}
          </span>
          <button
            onClick={() => signOut(auth)}
            className="text-xs bg-red-800 hover:bg-red-700 border border-red-700 px-3 py-1.5 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
