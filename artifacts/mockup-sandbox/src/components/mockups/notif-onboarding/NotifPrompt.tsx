import { Bell, CheckCircle2 } from "lucide-react";

export function NotifPrompt() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-between px-6 py-12 font-['Inter']">
      {/* Status bar simulation */}
      <div className="w-full flex justify-between items-center text-xs text-gray-400 mb-8">
        <span className="font-semibold text-gray-700">9:41</span>
        <div className="flex gap-1 items-center">
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><rect x="0" y="4" width="3" height="7" rx="0.5" fill="#374151"/><rect x="4" y="2.5" width="3" height="8.5" rx="0.5" fill="#374151"/><rect x="8" y="0" width="3" height="11" rx="0.5" fill="#374151"/><rect x="12.5" y="2" width="2.5" height="7" rx="0.5" fill="#D1D5DB"/></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" className="text-gray-700"><path d="M7.5 2.2C9.8 2.2 11.9 3.1 13.4 4.6L14.8 3.2C12.9 1.2 10.3 0 7.5 0C4.7 0 2.1 1.2 0.2 3.2L1.6 4.6C3.1 3.1 5.2 2.2 7.5 2.2Z"/><path d="M7.5 5.5C9 5.5 10.3 6.1 11.3 7L12.7 5.6C11.3 4.3 9.5 3.5 7.5 3.5C5.5 3.5 3.7 4.3 2.3 5.6L3.7 7C4.7 6.1 6 5.5 7.5 5.5Z"/><circle cx="7.5" cy="9.5" r="1.5"/></svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#374151"/><rect x="2" y="2" width="18" height="8" rx="2" fill="#374151"/><path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="#374151"/></svg>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-xs">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-200 mb-6">
          <Bell className="w-12 h-12 text-white" fill="white" />
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          Stay on top of<br />family life 💗
        </h1>

        <p className="text-base text-gray-500 mb-8 leading-relaxed">
          Enable notifications so we can remind your family about tasks, meals, and events —
          <span className="text-pink-500 font-medium"> so you don't have to.</span>
        </p>

        {/* Benefits */}
        <div className="w-full bg-pink-50 rounded-2xl p-4 mb-8 space-y-3">
          {[
            "Task reminders for every family member",
            "Meal planning & grocery alerts",
            "Calendar events & school pickups",
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-pink-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="w-full bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white font-semibold text-base py-4 rounded-2xl shadow-md shadow-pink-200 transition-all mb-4">
          Enable Notifications
        </button>

        <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2">
          Not now, maybe later
        </button>
      </div>

      {/* Bottom indicator */}
      <div className="w-32 h-1 rounded-full bg-gray-300 mt-8" />
    </div>
  );
}
