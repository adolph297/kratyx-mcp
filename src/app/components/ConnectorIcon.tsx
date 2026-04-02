'use client';

import { useState } from 'react';

/**
 * Enhanced Connector Icon with intelligent fallback logic:
 * 1. Try SVG format
 * 2. Try PNG format
 * 3. Fallback to Initials with custom background color
 */
export default function ConnectorIcon({ 
  name, 
  slug, 
  color, 
  size = 48 
}: { 
  name: string; 
  slug: string; 
  color?: string; 
  size?: number 
}) {
  const [ext, setExt] = useState<'svg' | 'png' | 'fallback'>('svg');
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fallbackColor = color || '#6366f1';

  return (
    <div 
      className="connector-icon-container" 
      style={{ 
        background: ext === 'fallback' ? `linear-gradient(135deg, ${fallbackColor}, ${fallbackColor}dd)` : 'transparent',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        fontSize: size * 0.4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: ext === 'fallback' ? 'none' : '1px solid var(--border-subtle)',
        padding: ext === 'fallback' ? 0 : size * 0.15,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        position: 'relative',
        boxShadow: ext === 'fallback' ? `0 4px 12px ${fallbackColor}33` : 'none',
      }}
    >
      {ext !== 'fallback' ? (
        <img 
          src={`/icons/${slug}.${ext}`} 
          alt={name}
          width={size}
          height={size}
          style={{ objectFit: 'contain', width: '100%', height: '100%', transition: 'all 0.3s ease' }}
          onError={() => {
            if (ext === 'svg') setExt('png');
            else setExt('fallback');
          }}
        />
      ) : (
        <span style={{ 
          color: 'white', 
          fontWeight: 800, 
          letterSpacing: '-0.02em',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {initials}
        </span>
      )}
      
      <style jsx>{`
        .connector-icon-container::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
