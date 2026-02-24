
export const GhostCard = ({ children, className = "" }) => (
  <div className={`ghost-card ${className}`}>
    {children}
  </div>
);


export const GhostInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`ghost-input ${className}`}
  />
);

export const GhostButton = ({ children, onClick, variant = "primary", className = "", disabled = false }) => {
  const variantClass = variant === 'secondary' ? 'btn-secondary' : 'btn-primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`ghost-button ${variantClass} ${className}`}
      style={disabled ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
    >
      {children}
    </button>
  );
};