import React from 'react';

export const jinoriaSite = (() => {
  try {
    const url = new URL(import.meta.env.VITE_JINORIA_URL || 'https://jinoria.com/');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : 'https://jinoria.com/';
  } catch {
    return 'https://jinoria.com/';
  }
})();

export function Link({ to, go, children, ...props }) {
  return <a href={to} {...props} onClick={event => {
    props.onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      go(to);
    }
  }}>{children}</a>;
}

export function JinoriaLink({ children, ...props }) {
  return <a href={jinoriaSite} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}
