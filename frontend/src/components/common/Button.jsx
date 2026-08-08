import React from 'react';
import Spinner from './Spinner';

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-from/50 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-white text-black hover:bg-gray-200 rounded-xl',
    secondary: 'bg-card border border-border-subtle text-text-primary hover:bg-border-subtle/30 rounded-xl',
    ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-card rounded-xl',
    icon: 'bg-card text-text-primary hover:bg-border-subtle/30 rounded-full p-2'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    icon: '' // Size is handled by padding in the variant
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = variant === 'icon' ? sizes.icon : sizes[size] || sizes.md;

  return (
    <button
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="mr-2">
          <Spinner size={variant === 'icon' ? 18 : 16} className="text-current" />
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;
