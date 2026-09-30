"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { TaskItem } from "@/components/EditTaskModal";
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Database,
  Users,
  LogIn,
  ArrowRight,
  UserPlus,
  FolderKanban,
} from "lucide-react";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const refreshTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setFetchError("");
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error("Unable to load tasks from server");
      }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error(err);
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch tasks."
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      refreshTasks();
    }
  }, [authLoading, refreshTasks]);

  const handleTaskCreated = (newTask: TaskItem) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleUpdateTask = (updatedTask: TaskItem) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

  const handleDeleteTask = (deletedId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-2xl">
        {/* Ambient glow backgrounds */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Assignment 2 • Task & Team Management Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Collaborative Task & <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-200 to-white">
              Team Management Platform
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            {user
              ? `Welcome back, ${user.name}! Organize team deliverables, invite teammates, and monitor milestone progression in real time.`
              : "A robust multi-user workspace built with Next.js, Prisma ORM, and Supabase PostgreSQL. Create teams, assign tasks to members, and track status with role-based permissions."}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user ? (
              <Link
                href="/teams"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
              >
                <Users className="w-4 h-4" />
                <span>Go to Team Workspaces</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/15 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Free</span>
                </Link>
              </>
            )}
          </div>

          {/* System Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Supabase PostgreSQL
            </span>
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Prisma ORM
            </span>
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              JWT Auth & RBAC
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {user ? (
        <div className="space-y-8">
          {/* Create Task Form */}
          <TaskForm onTaskCreated={handleTaskCreated} />

          {/* Error Alert */}
          {fetchError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Notice: Database Connection</p>
                <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300">
                  {fetchError}
                </p>
              </div>
              <button
                onClick={refreshTasks}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Task List Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>My Task Deliverables</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tasks.length} total
                </span>
              </h2>

              <Link
                href="/teams"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1"
              >
                <span>View by Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <TaskList
              tasks={tasks}
              isLoading={isLoading}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          </section>
        </div>
      ) : (
        /* Public Visitor Features Showcase */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              User Authentication
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Secure registration, login with password hashing (bcrypt), and stateless JWT sessions with HTTP-only cookies.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Team Workspaces & Roles
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Create teams as Owner, invite colleagues by email, manage team memberships, and switch between multiple teams easily.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Kanban Board & Filtering
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Interactive Kanban board view, status updates, assignee delegation, due date tracking, and instant search & filters.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
