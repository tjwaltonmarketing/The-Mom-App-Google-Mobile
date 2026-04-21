import { Bell } from "lucide-react";

const notifications = [
  {
    delay: "1 hour after install",
    icon: "💗",
    title: "The Mom App",
    message: "Hey! Your free 14-day trial is waiting 💗 Takes 60 seconds to get started.",
    time: "1h ago",
    color: "from-pink-50 to-white",
    dot: "bg-pink-400",
  },
  {
    delay: "24 hours",
    icon: "⭐",
    title: "The Mom App",
    message: "Still thinking it over? Totally get it. Here's what moms are saying about The Mom App...",
    time: "Yesterday",
    color: "from-purple-50 to-white",
    dot: "bg-purple-400",
  },
  {
    delay: "72 hours",
    icon: "⏰",
    title: "The Mom App",
    message: "Your trial hasn't started yet — which means you haven't saved any time this week. Let's change that 😊",
    time: "3 days ago",
    color: "from-amber-50 to-white",
    dot: "bg-amber-400",
  },
  {
    delay: "7 days",
    icon: "💌",
    title: "The Mom App",
    message: "Last nudge, we promise. Your free trial is still here whenever you're ready. 💗",
    time: "7 days ago",
    color: "from-rose-50 to-white",
    dot: "bg-rose-400",
  },
];

export function NotifSequence() {
  return (
    <div className="min-h-screen bg-gray-100 font-['Inter']">
      {/* iOS-style notification center header */}
      <div className="bg-gray-100 pt-12 pb-4 px-4">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs text-gray-400 font-['Inter']">9:41</span>
          <div className="w-28 h-6 bg-black rounded-full mx-auto" />
          <span className="text-xs text-gray-400">⚡</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <button className="text-sm text-blue-500 font-medium">Clear All</button>
        </div>
        <p className="text-xs text-gray-400 mb-1">Notification recovery sequence — what the user receives if they install but don't sign up</p>
      </div>

      {/* Notification cards */}
      <div className="px-4 space-y-3 pb-8">
        {notifications.map((notif, i) => (
          <div key={i} className="relative">
            {/* Timeline connector */}
            {i < notifications.length - 1 && (
              <div className="absolute left-6 top-full w-0.5 h-3 bg-gray-300 z-10" />
            )}

            {/* Timing badge */}
            <div className="flex items-center gap-2 mb-1 pl-1">
              <div className={`w-2 h-2 rounded-full ${notif.dot}`} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {notif.delay}
              </span>
            </div>

            {/* iOS-style notification */}
            <div className={`bg-gradient-to-br ${notif.color} rounded-2xl shadow-sm border border-white/80 overflow-hidden`}>
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* App icon */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-lg">{notif.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {notif.title}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{notif.time}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                  </div>
                </div>
              </div>

              {/* Swipe actions hint */}
              <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
                <span className="text-xs text-blue-500 font-medium">Open →</span>
              </div>
            </div>
          </div>
        ))}

        {/* End note */}
        <div className="bg-gray-200/60 rounded-2xl px-4 py-3 text-center">
          <Bell className="w-4 h-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400">After 7 days — sequence complete. No more nudges.</p>
        </div>
      </div>
    </div>
  );
}
