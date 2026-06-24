import React from 'react';

export default function Logo({ size = 32, style = {} }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
      background: '#151515',
      ...style
    }}>
      <img
        src="/logo.png"
        alt="Cropnow Logo"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '150%',
          height: 'auto',
          transform: 'translate(-48%, -50%)'
        }}
      />
    </div>
  );
}
