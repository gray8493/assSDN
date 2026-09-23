import Link from "next/link";
import { Users, ArrowLeft, Shield, UserPlus, FolderKanban } from "lucide-react";

export default function TeamsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tasks</span>
      </Link>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Users className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 mb-4">
          Coming in Assignment 2
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Team Management & Collaboration
        </h1>

        <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          The Teams module will unlock multi-user capabilities, team spaces, role-based
          member assignments, and collaborative project workspaces.
        </p>

        {/* Feature roadmap preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 text-left">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center mb-2">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Team Workspaces
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage multiple teams with customized settings.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Member Invitations
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Invite teammates via email and assign tasks directly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Role-Based Access
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Granular permissions for Admins, Members, and Viewers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
