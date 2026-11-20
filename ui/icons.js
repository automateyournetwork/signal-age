// Signal Age · small line icons for the build bar (inline SVG, currentColor, decorative only).

const ICONS = {
  voice: '<path d="M5 6h22v14H14l-7 6v-6H5z"/><path d="M10 11h12M10 15h8"/>',
  drum: '<ellipse cx="16" cy="12" rx="10" ry="4"/><path d="M6 12v9c0 2.3 4.5 4 10 4s10-1.7 10-4v-9"/><path d="M8 4l6 7M24 4l-6 7"/>',
  beacon: '<path d="M16 3c2.5 4.5 7 6.5 7 12a7 7 0 0 1-14 0c0-3 1.8-5 3-7 .8 2 2 3.2 3.8 3.2C15 8 15 5.5 16 3z"/><path d="M7 28h18M10 28l2-5h8l2 5"/>',
  courier: '<circle cx="18" cy="5" r="2.6"/><path d="M17 9l-3 8 4 3-1 8M14 17l-5 3M17 11l5 3 3-2M18 20l5 7"/>',
  horse: '<path d="M9 27V15a7 7 0 0 1 14 0v12"/><path d="M6 27h6M20 27h6"/><path d="M11 13h.01M21 13h.01M10 19h.01M22 19h.01"/>',
  semaphore: '<path d="M16 28V8M10 28h12M13 28l3-20 3 20"/><path d="M16 8L7 4M16 8l8 5"/>',
  telegraph: '<path d="M3 9q13 8 26 0"/><path d="M17 11l-4 8h5l-3 8"/>',
  telephone: '<path d="M9 5c-2 0-3 2-3 3.4C6 18.6 13.6 26 23.6 26c1.4 0 3.4-1 3.4-3l-1-4.4-5.2-1.2-2.2 3c-3-1.2-6.2-4.4-7.4-7.4l3-2.2L13 5.6z"/>',
  carrier: '<circle cx="16" cy="16" r="10.5"/><circle cx="16" cy="16" r="3"/><path d="M16 5.5V13M16 19v7.5M5.5 16H13M19 16h7.5"/>',
  copper: '<rect x="7" y="9" width="18" height="14" rx="2"/><path d="M11 9V5M16 9V5M21 9V5M11 27v-4M16 27v-4M21 27v-4"/>',
  fiber: '<circle cx="16" cy="16" r="3.5"/><path d="M16 3v7M16 22v7M3 16h7M22 16h7M7 7l4.5 4.5M20.5 20.5L25 25M25 7l-4.5 4.5M11.5 20.5L7 25"/>',
  home: '<path d="M4 16l12-10 12 10"/><path d="M8 14v13h16V14"/><path d="M16 27v-7"/><path d="M2 27h28"/>',
  tower: '<path d="M16 10v18M11 28l5-18 5 18M13 22h6"/><path d="M9 4a9 9 0 0 0 0 11M23 4a9 9 0 0 1 0 11M12.5 6.5a4.5 4.5 0 0 0 0 6M19.5 6.5a4.5 4.5 0 0 1 0 6"/>',
  dish: '<path d="M5 19a13 13 0 0 1 14-14z"/><path d="M12 12l10-10M11 22l-4 6h11"/>',
  satellite: '<rect x="12" y="12" width="8" height="8" rx="1"/><path d="M3 13h8v6H3zM21 13h8v6h-8z"/><path d="M16 12V7M13.5 7h5"/><path d="M10 26a8 8 0 0 0 12 0"/>',
};

const BY_MEDIUM = {
  'spoken-word': 'voice', 'signal-drum': 'drum', 'smoke-beacon': 'beacon', 'foot-courier': 'courier', 'horse-relay': 'horse',
  'optical-telegraph': 'semaphore', 'electric-telegraph': 'telegraph', 'telephone-line': 'telephone', 'analog-carrier': 'carrier',
  t1: 'copper', t3: 'fiber', 'oc-3': 'fiber', 'oc-12': 'fiber', 'oc-48': 'fiber', 'ethernet-fiber': 'home',
  'cellular-2g': 'tower', 'broadband-3g': 'tower', 'lte-4g': 'tower', 'midband-5g': 'tower', 'fixed-wireless': 'dish',
  'leo-satellite': 'satellite', 'geo-satellite': 'satellite',
};

export function iconFor(mediumId) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[BY_MEDIUM[mediumId]] || ICONS.voice}</svg>`;
  return span;
}

// How a built technology is drawn on the map.
export function drawStyleFor(mediumId) {
  return {
    'spoken-word': 'voice', 'signal-drum': 'drum', 'smoke-beacon': 'beacon', 'foot-courier': 'courier', 'horse-relay': 'courier',
    'optical-telegraph': 'semaphore', 'electric-telegraph': 'wire', 'telephone-line': 'wire', 'analog-carrier': 'wire', t1: 'copper',
    t3: 'fiber', 'oc-3': 'fiber', 'oc-12': 'fiber', 'oc-48': 'fiber', 'ethernet-fiber': 'area-fiber',
    'cellular-2g': 'area-wireless', 'broadband-3g': 'area-wireless', 'lte-4g': 'area-wireless', 'midband-5g': 'area-wireless',
    'fixed-wireless': 'area-wireless', 'leo-satellite': 'area-satellite', 'geo-satellite': 'area-satellite',
  }[mediumId] || 'wire';
}
