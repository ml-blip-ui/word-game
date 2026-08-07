import type { ButtonHTMLAttributes, CSSProperties } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outline';
  color?: string; // fill (filled) or border+text (outline)
  textColor?: string;
  corners?: string; // border-radius shorthand, hand-drawn asymmetry
  fontSize?: number;
  padding?: string;
}

// Hand-drawn corners: each button gets a slightly different radius per
// corner so nothing reads as stamped from the same die (design spec §3.5).
export function Button({
  variant = 'filled',
  color = 'var(--gradient-primary)',
  textColor,
  corners = '20px 15px 22px 16px',
  fontSize = 18,
  padding = '19px',
  style,
  children,
  ...rest
}: ButtonProps) {
  const filled = variant === 'filled';
  const computedStyle: CSSProperties = {
    padding,
    borderRadius: corners,
    border: `2.2px solid var(--ink)`,
    background: filled ? color : 'transparent',
    color: filled ? (textColor ?? 'var(--cream)') : (textColor ?? color),
    fontWeight: 800,
    fontSize,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    ...style,
  };
  return (
    <button style={computedStyle} {...rest}>
      {children}
    </button>
  );
}
