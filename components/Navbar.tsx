"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Users, LogIn } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500">
                TaskPulse
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                Ass1
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/"
                  ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tasks</span>
            </Link>

            <Link
              href="/teams"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/teams"
                  ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teams</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Soon
              </span>
            </Link>

            {/* Login placeholder */}
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 sm:mx-2" />

            <button
              type="button"
              onClick={() =>
                alert("Login functionality will be introduced in Assignment 2 & 3!")
              }
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Authentication not required for Assignment 1"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
