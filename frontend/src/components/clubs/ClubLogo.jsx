import React, { useState, useEffect } from 'react';

/**
 * Generate clean 1-3 letter initials for a club name
 * Examples:
 * "Developer Student Club" -> "DSC"
 * "Robotics" -> "ROB"
 * "AI & ML Club" -> "AMC"
 */
const getClubInitials = (name) => {
  if (!name || typeof name !== 'string') return 'C';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'C';
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
};

/**
 * Reusable Club Logo component with robust error fallback to initials
 */
export const ClubLogo = ({
  logoUrl,
  name = '',
  size = 'md',
  className = '',
  imgClassName = '',
  fallbackClassName = ''
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the URL changes
  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded',
    sm: 'w-7 h-7 text-xs rounded',
    md: 'w-8 h-8 text-xs rounded-lg',
    lg: 'w-10 h-10 text-sm rounded-lg',
    xl: 'w-14 h-14 text-xl rounded-xl'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={name ? `${name} logo` : 'Club logo'}
        onError={() => setHasError(true)}
        className={`${currentSizeClass} object-cover border border-border shrink-0 shadow-subtle ${imgClassName} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${currentSizeClass} bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center shrink-0 tracking-wide select-none ${fallbackClassName} ${className}`}
      title={name}
      aria-label={name}
    >
      {getClubInitials(name)}
    </div>
  );
};

export default ClubLogo;
