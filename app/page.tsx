"use client";

import { useEffect, useState } from "react";
import TaskForm from "@/components/TaskForm";
import TaskList from "@/components/TaskList";
import { TaskItem } from "@/components/EditTaskModal";
import { Sparkles, CheckCircle2, ShieldCheck, Database } from "lucide-react";

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const refreshTasks = async () => {
    try {
      setIsLoading(true);
      setFetchError("");
      const res = await fetch("/api/tasks");
      if (!res.ok) {
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
  };

  useEffect(() => {
    let ignore = false;
    async function fetchInitialTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) {
          throw new Error("Unable to load tasks from server");
        }
        const data = await res.json();
        if (!ignore) {
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch (err: unknown) {
        console.error(err);
        if (!ignore) {
          setFetchError(
            err instanceof Error ? err.message : "Failed to fetch tasks."
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchInitialTasks();
    return () => {
      ignore = true;
    };
  }, []);


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
      <section className="relative rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-xl">
        {/* Glow ambient background elements */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Assignment 1 • Public Task Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Task & Team <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-200 to-white">
              Management Platform
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Welcome to the TaskPulse management foundation. Organize projects,
            track deliverables, and monitor milestones. Fully connected to Supabase
            PostgreSQL via Prisma ORM with live real-time CRUD operations.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Supabase PostgreSQL
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Prisma ORM
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              Public CRUD (No Auth Required)
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area: Form & Task List */}
      <div className="space-y-8">
        {/* Create Task Form */}
        <TaskForm onTaskCreated={handleTaskCreated} />

        {/* Error Alert if Database connection fails */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Notice: Database Connection</p>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300">
                {fetchError}. If you haven&apos;t run Prisma migrations on your Supabase database yet, please configure DATABASE_URL in your environment and run migrations.
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Task Deliverables
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {tasks.length} total {tasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </section>
      </div>
    </div>
  );
}
