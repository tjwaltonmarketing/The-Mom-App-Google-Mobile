import { Home, Calendar, CheckSquare, Utensils } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="md:hidden bg-white dark:bg-card blue-light-filter:bg-card border-t border-gray-200 dark:border-border blue-light-filter:border-border fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around py-2">
        <a href="#" className="flex flex-col items-center py-2 px-3 text-primary">
          <Home className="text-lg" />
          <span className="text-xs mt-1">Home</span>
        </a>
        <a href="#" className="flex flex-col items-center py-2 px-3 text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600">
          <Calendar className="text-lg" />
          <span className="text-xs mt-1">Calendar</span>
        </a>
        <a href="#" className="flex flex-col items-center py-2 px-3 text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600">
          <CheckSquare className="text-lg" />
          <span className="text-xs mt-1">Tasks</span>
        </a>
        <a href="#" className="flex flex-col items-center py-2 px-3 text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-600">
          <Utensils className="text-lg" />
          <span className="text-xs mt-1">Meals</span>
        </a>
      </div>
    </nav>
  );
}
