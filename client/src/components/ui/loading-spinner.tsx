import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "mom" | "family" | "heart" | "default";
  className?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default",
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const HeartSpinner = () => (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary">
        <motion.path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );

  const FamilySpinner = () => (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 border-2 border-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "linear"
          }}
          style={{
            borderTopColor: "transparent",
            borderRightColor: i === 1 ? "transparent" : undefined,
            borderBottomColor: i === 2 ? "transparent" : undefined,
          }}
        />
      ))}
    </div>
  );

  const MomSpinner = () => (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{ rotate: [0, 180, 360] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="text-primary">
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60 40"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  );

  const DefaultSpinner = () => (
    <motion.div
      className={`${sizeClasses[size]} ${className} border-2 border-gray-200 border-t-primary rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );

  const getSpinner = () => {
    switch (variant) {
      case "heart":
        return <HeartSpinner />;
      case "family":
        return <FamilySpinner />;
      case "mom":
        return <MomSpinner />;
      default:
        return <DefaultSpinner />;
    }
  };

  return getSpinner();
}