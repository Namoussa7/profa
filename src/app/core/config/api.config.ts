// Render: the static site and the API live on different hosts.
// Docker Compose / Nginx: the API is proxied on the same origin under /api.
// `ng serve` (port 4200): the backend runs locally on 8080.
const loc = typeof window !== 'undefined' ? window.location : null;

export const API_BASE_URL =
  loc && loc.hostname.endsWith('onrender.com') ? 'https://profa-backend.onrender.com'
  : loc && loc.port === '4200' ? 'http://localhost:8080'
  : '';
