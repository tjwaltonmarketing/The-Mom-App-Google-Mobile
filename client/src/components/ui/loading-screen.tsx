import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
  variant?: "mom" | "family" | "calendar" | "tasks" | "default";
  duration?: number;
  onComplete?: () => void;
}

export function LoadingScreen({ 
  message = "Loading...", 
  variant = "default",
  duration = 3000,
  onComplete 
}: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  const FamilyIllustration = () => (
    <motion.div
      className="relative w-32 h-32 mx-auto mb-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Mom figure */}
      <motion.div
        className="absolute left-6 top-4"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
          <circle cx="12" cy="6" r="4" fill="#F472B6" />
          <path d="M12 12 C6 12, 6 18, 6 24 C6 28, 8 30, 12 30 C16 30, 18 28, 18 24 C18 18, 18 12, 12 12 Z" fill="#F472B6" />
          <motion.path
            d="M8 20 C8 18, 10 16, 12 16 C14 16, 16 18, 16 20 C16 22, 12 24, 12 24 C12 24, 8 22, 8 20 Z"
            fill="#DC2626"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 1, duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          />
        </svg>
      </motion.div>

      {/* Dad figure */}
      <motion.div
        className="absolute right-6 top-4"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
          <circle cx="12" cy="6" r="4" fill="#3B82F6" />
          <path d="M12 12 C6 12, 6 18, 6 24 C6 28, 8 30, 12 30 C16 30, 18 28, 18 24 C18 18, 18 12, 12 12 Z" fill="#3B82F6" />
        </svg>
      </motion.div>

      {/* Child figures */}
      <motion.div
        className="absolute left-10 top-20"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <circle cx="8" cy="4" r="3" fill="#10B981" />
          <path d="M8 8 C4 8, 4 12, 4 18 C4 20, 6 22, 8 22 C10 22, 12 20, 12 18 C12 12, 12 8, 8 8 Z" fill="#10B981" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute right-10 top-20"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <circle cx="8" cy="4" r="3" fill="#F59E0B" />
          <path d="M8 8 C4 8, 4 12, 4 18 C4 20, 6 22, 8 22 C10 22, 12 20, 12 18 C12 12, 12 8, 8 8 Z" fill="#F59E0B" />
        </svg>
      </motion.div>

      {/* Floating hearts */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${20 + i * 25}%`,
            top: `${60 + i * 10}%`,
          }}
          animate={{
            y: [-5, -15, -5],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="#F472B6">
            <path d="M4 7 C4 7, 1 4, 1 2.5 C1 1.5, 2 1, 2.5 1 C3 1, 4 2, 4 2 C4 2, 5 1, 5.5 1 C6 1, 7 1.5, 7 2.5 C7 4, 4 7, 4 7 Z" />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );

  const CalendarIllustration = () => (
    <motion.div
      className="relative w-32 h-32 mx-auto mb-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="w-24 h-24 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-primary mx-auto"
        initial={{ rotateY: -90 }}
        animate={{ rotateY: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div className="bg-primary h-6 rounded-t-md flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-1 h-3 bg-white rounded"></div>
            <div className="w-1 h-3 bg-white rounded"></div>
          </div>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
      <motion.div
        className="absolute -top-2 -right-2"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#F472B6">
          <path d="M8 2 L9 6 L13 7 L9 8 L8 12 L7 8 L3 7 L7 6 Z" />
        </svg>
      </motion.div>
    </motion.div>
  );

  const TasksIllustration = () => (
    <motion.div
      className="relative w-32 h-32 mx-auto mb-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
          >
            <motion.div
              className="w-4 h-4 border-2 border-primary rounded-sm flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              animate={i === 0 ? { backgroundColor: "#E11D48" } : {}}
              transition={{ delay: 2 + i * 0.5 }}
            >
              {i === 0 && (
                <motion.svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2.2 }}
                >
                  <path d="M1 4 L3 6 L7 2" stroke="white" strokeWidth="1" fill="none" />
                </motion.svg>
              )}
            </motion.div>
            <div className="flex-1">
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const MomIllustration = () => (
    <motion.div
      className="relative w-32 h-32 mx-auto mb-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="w-20 h-20 mx-auto"
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="40" fill="#F472B6" />
          {/* Mom figure with superhero cape */}
          <motion.path
            d="M20 35 Q15 30, 20 25 Q25 30, 30 25 Q35 30, 40 25 Q45 30, 50 25 Q55 30, 60 25 Q65 30, 60 35"
            stroke="#DC2626"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 2 }}
          />
          <circle cx="40" cy="20" r="6" fill="white" />
          <path d="M40 28 C30 28, 30 35, 30 45 C30 50, 35 55, 40 55 C45 55, 50 50, 50 45 C50 35, 50 28, 40 28 Z" fill="white" />
          <motion.path
            d="M35 40 C35 38, 37 36, 40 36 C43 36, 45 38, 45 40 C45 42, 40 45, 40 45 C40 45, 35 42, 35 40 Z"
            fill="#DC2626"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </motion.div>
      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <span className="text-xs font-medium text-primary">Super Mom Mode</span>
      </motion.div>
    </motion.div>
  );

  const getIllustration = () => {
    switch (variant) {
      case "family":
        return <FamilyIllustration />;
      case "calendar":
        return <CalendarIllustration />;
      case "tasks":
        return <TasksIllustration />;
      case "mom":
        return <MomIllustration />;
      default:
        return <FamilyIllustration />;
    }
  };

  const getLoadingMessage = () => {
    switch (variant) {
      case "family":
        return "Gathering your family...";
      case "calendar":
        return "Syncing your schedule...";
      case "tasks":
        return "Organizing your tasks...";
      case "mom":
        return "Activating super mom powers...";
      default:
        return message;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center max-w-sm px-6">
            {getIllustration()}
            
            <motion.h2
              className="text-2xl font-logo uppercase text-gray-900 dark:text-white mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              THE MOM APP
            </motion.h2>
            
            <motion.p
              className="text-gray-600 dark:text-gray-300 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              {getLoadingMessage()}
            </motion.p>
            
            {/* Animated progress dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}