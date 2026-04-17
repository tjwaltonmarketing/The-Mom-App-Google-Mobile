import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  path: string;
  done: boolean;
}

function useGettingStartedData() {
  const { data: familyMembers } = useQuery<any[]>({
    queryKey: ["/api/family-members"],
    staleTime: 60_000,
  });

  const { data: events } = useQuery<any[]>({
    queryKey: ["/api/events"],
    staleTime: 60_000,
  });

  const { data: tasks } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    staleTime: 60_000,
  });

  const { data: textNotes } = useQuery<any[]>({
    queryKey: ["/api/text-notes"],
    staleTime: 60_000,
  });

  const { data: voiceNotes } = useQuery<any[]>({
    queryKey: ["/api/voice-notes/all"],
    staleTime: 60_000,
  });

  const { data: meals } = useQuery<any[]>({
    queryKey: ["/api/meal-plans"],
    staleTime: 60_000,
  });

  const hasFamilyMember = (familyMembers?.length ?? 0) > 0;
  const hasEvent = (events?.length ?? 0) > 0;
  const hasTask = (tasks?.length ?? 0) > 0;
  const hasTextNote = (textNotes?.length ?? 0) > 0;
  const hasVoiceNote = (voiceNotes?.length ?? 0) > 0;
  const hasMeal = (meals?.length ?? 0) > 0;

  return { hasFamilyMember, hasEvent, hasTask, hasTextNote, hasVoiceNote, hasMeal };
}

export function GettingStarted() {
  const [, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("getting_started_dismissed") === "true"
  );
  const { hasFamilyMember, hasEvent, hasTask, hasTextNote, hasVoiceNote, hasMeal } =
    useGettingStartedData();

  const items: ChecklistItem[] = [
    {
      id: "family",
      label: "Add a family member",
      description: "Invite your partner, kids, or anyone who shares the load.",
      path: "/settings",
      done: hasFamilyMember,
    },
    {
      id: "event",
      label: "Add a calendar event",
      description: "Put something on the family calendar so everyone's in the loop.",
      path: "/calendar",
      done: hasEvent,
    },
    {
      id: "task",
      label: "Create a task",
      description: "Add something to the to-do list and assign it to someone.",
      path: "/tasks",
      done: hasTask,
    },
    {
      id: "note",
      label: "Write a text note",
      description: "Jot down a thought, idea, or reminder.",
      path: "/notes",
      done: hasTextNote,
    },
    {
      id: "meal",
      label: "Plan a meal",
      description: "Add something to this week's meal plan.",
      path: "/meal-plan",
      done: hasMeal,
    },
    {
      id: "voice",
      label: "Try the voice AI",
      description: "Tap the mic button to dictate tasks, events, or reminders hands-free.",
      path: "/notes",
      done: hasVoiceNote,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  if (dismissed || allDone) return null;

  const handleItemClick = (item: ChecklistItem) => {
    setLocation(item.path);
  };

  const handleDismiss = () => {
    localStorage.setItem("getting_started_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Get started — {completedCount}/{items.length} done
            </p>
            {/* Progress bar */}
            <div className="mt-1 w-48 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.done}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  item.done
                    ? "opacity-50 cursor-default"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/40 active:bg-gray-100"
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      item.done
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {item.label}
                  </p>
                  {!item.done && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
