"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
} from "lucide-react";
import { TaskItem } from "./EditTaskModal";

interface TaskCardProps {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: string) => void;
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DONE":
        return {
          label: "Done",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40",
          icon: <CircleDashed className="w-3.5 h-3.5 animate-spin" />,
        };
      default:
        return {
          label: "To Do",
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return {
          label: "High Priority",
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40",
          icon: <AlertTriangle className="w-3 h-3" />,
        };
      case "LOW":
        return {
          label: "Low Priority",
          bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/40",
          icon: null,
        };
      default:
        return {
          label: "Medium Priority",
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
          icon: null,
        };
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          onDelete(task.id);
        } else {
          alert("Failed to delete task.");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting task.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const statusInfo = getStatusBadge(task.status);
  const priorityInfo = getPriorityBadge(task.priority);

  return (
    <div className="group relative bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50 flex flex-col justify-between">
      <div>
        {/* Badges & Actions row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${priorityInfo.bg}`}
            >
              {priorityInfo.icon}
              {priorityInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
              title="Edit Task"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
          {task.title}
        </h3>

        {/* Description */}
        {task.description ? (
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
            {task.description}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-600 italic">
            No description provided.
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <span
              className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium"
              title="Due date"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          <span>
            Added {new Date(task.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Quick status switch */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
    </div>
  );
}
