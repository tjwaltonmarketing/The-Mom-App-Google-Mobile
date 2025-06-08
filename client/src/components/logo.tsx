import logoPath from "@assets/playstore.png";

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
        alt="The Mom App Icon" 
        className={`${className} object-contain rounded-lg`}
        onError={handleImageError}
      />
      {/* SVG Fallback */}
      <svg 
        className={`${className} hidden object-contain rounded-lg`}
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="256" cy="256" r="256" fill="hsl(345, 83%, 61%)" />
        <g fill="white" strokeWidth="16">
          {/* Mom figure with heart */}
          <circle cx="256" cy="150" r="48" />
          <path d="M256 220 C200 220, 160 260, 160 320 L160 420 L352 420 L352 320 C352 260, 312 220, 256 220 Z" />
          {/* Heart in center */}
          <path d="M210 290 C210 270, 225 255, 245 255 C255 255, 256 270, 256 290 C256 270, 257 255, 267 255 C287 255, 302 270, 302 290 C302 320, 256 360, 256 360 C256 360, 210 320, 210 290 Z" />
        </g>
      </svg>
    </div>
  );
}