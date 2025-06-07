import logoPath from "@assets/The Mom app_20250607_125224_0002_1749322541390.png";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "h-10 w-10", size = 40 }: LogoProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Fallback to SVG if image fails to load
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const svg = target.nextElementSibling as HTMLElement;
    if (svg) {
      svg.style.display = 'block';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <img 
        src={logoPath} 
        alt="The Mom App" 
        className={className}
        onError={handleImageError}
      />
      {/* SVG Fallback */}
      <svg 
        className={`${className} hidden`}
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="50" fill="hsl(345, 83%, 61%)" />
        <g fill="white" stroke="white" strokeWidth="3">
          {/* Head */}
          <circle cx="50" cy="25" r="8" />
          {/* Body with heart */}
          <path d="M50 35 C35 35, 35 50, 35 65 C35 75, 45 85, 50 85 C55 85, 65 75, 65 65 C65 50, 65 35, 50 35 Z" />
          {/* Heart in center */}
          <path d="M43 50 C43 47, 45 45, 47 45 C49 45, 50 47, 50 50 C50 47, 51 45, 53 45 C55 45, 57 47, 57 50 C57 55, 50 60, 50 60 C50 60, 43 55, 43 50 Z" fill="hsl(345, 83%, 61%)" />
        </g>
      </svg>
    </div>
  );
}