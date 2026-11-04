/* Minimal hash router: #/login, #/app/..., #/invite. Landing anchors (#how) are left alone. */
import { useSyncExternalStore } from 'react';

const read = () => (window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/');

export function useRoute() {
  return useSyncExternalStore((f) => { window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, read);
}

export function go(path) {
  window.location.hash = path;
  window.scrollTo(0, 0);
}
