import React from 'react';
import * as icons from 'lucide-react';

const toPascal = (s) =>
  String(s || '').replace(/(^|[-_])([a-z0-9])/g, (_, __, c) => c.toUpperCase());

export function Icon({ name, size = 18, strokeWidth = 1.75, color = 'currentColor', style, className }) {
  const key = toPascal(name);
  const LucideIcon = icons[key];
  if (!LucideIcon) return <span style={{ display: 'inline-block', width: size, height: size }} />;
  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={{ display: 'block', flex: 'none', ...style }}
    />
  );
}
