import { useState, useRef, useEffect } from "react";

type IconPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  previewSize?: "sm" | "md" | "lg";
};

export function IconPreview({ src, alt, className = "", previewSize = "md" }: IconPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLImageElement>(null);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    updatePreviewPosition(e);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePreviewPosition(e);
  };

  const updatePreviewPosition = (e: React.MouseEvent) => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      
      // Position the preview above the icon, centered
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + window.scrollY - 20; // 20px above the icon
      
      setPreviewPosition({ x, y });
    }
  };

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isHovered && iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setIsHovered(false);
      }
    };

    const handleScroll = () => {
      if (isHovered) {
        setIsHovered(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true); // Use capture to catch all scroll events
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [isHovered]);

  // Close preview when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHovered) {
        setIsHovered(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHovered]);

  return (
    <>
      <img
        ref={iconRef}
        src={src}
        alt={alt}
        className={`${className} cursor-pointer transition-transform duration-200 hover:scale-105`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        loading="lazy"
      />
      
      {isHovered && (
        <div
          className="fixed z-50 shadow-2xl border-2 border-white rounded-lg overflow-hidden bg-white transition-opacity duration-300 ease-out"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            transform: "translate(-50%, -100%)", // Center horizontally and position above
            maxWidth: "90vw",
            maxHeight: "90vh",
            opacity: isHovered ? 1 : 0,
          }}
        >
          <img
            src={src}
            alt={`${alt} preview`}
            className={`${sizeClasses[previewSize]} object-contain bg-white`}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 text-center truncate">
            {alt}
          </div>
        </div>
      )}
    </>
  );
}