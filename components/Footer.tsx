export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-8 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              TaskPulse App
            </span>
            <span>•</span>
            <span>Assignment 1 – Project Setup, Prisma & Deployment</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase PostgreSQL & Next.js
            </span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
