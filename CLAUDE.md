# Dashboard — Claude Context

> Full project context (all repos, fix history, architecture decisions) is in the root CLAUDE.md:
> @../CLAUDE.md
>
> This file covers Dashboard-specific quick reference only.

---

## What This Repo Is

React 19 + Vite admin dashboard. Connects to the Brain API via REST (axios) and Socket.IO for real-time bot monitoring. Served as a static build from Lightsail via nginx.

---

## Quick Commands

```bash
npm run dev     # dev server at http://localhost:5173
npm run build   # production build → dist/
npm run preview # preview production build locally
```

---

## Key Files — Open These First

| File | Why |
|------|-----|
| `src/App.jsx` | All routes — add new pages here |
| `src/apis/axios.js` | Axios instance — base URL + silent refresh interceptor |
| `src/components/sidebar.jsx` | Navigation — add links here for new pages |
| `src/components/jobCard.jsx` | Job card — scores, proposal UI, field display |
| `src/pages/jobsPage.jsx` | Main job browser — filters, sorting, export |
| `src/pages/botMonitor.jsx` | Scraper monitor — Socket.IO real-time updates |
| `src/pages/relevanceSettings.jsx` | Unified settings (8 tabs) |
| `src/middleware.js` | Token storage helpers |

---

## Style Rules — Always Follow These

- **Tailwind only** — no inline styles, no CSS modules, no styled-components
- **shadcn/ui components** — use existing components from `src/components/ui/` for all interactive elements (Button, Input, Dialog, Select, Tabs, Badge, etc.)
- **Mobile-first** — every new component must work on small screens; use `sm:`, `md:`, `lg:` prefixes
- **Overflow on mobile** — use `overflow-x-auto` + `min-w-max` for tables and tab bars

---

## Constraints — Never Break These

- **Do NOT change field names in jobCard.jsx** — it destructures directly from the job object using Brain's exact field names
- **Do NOT change how `relevance` or `semanticRelevance` are accessed** — must match Brain's returned shape
- **Do NOT change `apis/axios.js` base URL config** — all API calls depend on it
- **Do NOT remove shadcn/ui imports** — always add UI using existing shadcn components
- **Do NOT create `.css` files** — Tailwind only

---

## Adding a New Page

```jsx
// 1. Create src/pages/MyPage.jsx
// 2. Add route in App.jsx:
<Route path="/my-page" element={
  <PrivateRoute><Layout><MyPage /></Layout></PrivateRoute>
} />

// 3. Add nav link in sidebar.jsx (with lucide-react icon)
// 4. Add API functions in src/apis/myPage.js if needed
```

---

## API Layer Pattern

All API files export async functions. Call them directly — the axios interceptor handles auth transparently:

```js
import { getFilteredJobs } from '../apis/jobs';

const response = await getFilteredJobs({ search: 'React', minScore: 50 });
const { jobs, total, totalAll } = response.data.data;
```

On 401: interceptor silently calls `/auth/refresh`, then retries the original request. No manual token handling needed.

---

## Auth & Roles

| Role | Access |
|------|--------|
| `user` | All pages except User Management |
| `admin` | + can create users via `/auth/register` |
| `superAdmin` | Full access including User Management |

Role is available from `getMe()` API call. `PrivateRoute` handles redirect to `/login` if no token.

---

## Socket.IO (Bot Monitor)

```js
import { io } from 'socket.io-client';
const socket = io(BASE_URL, { path: '/up-bot-brain-api/socket.io' });

socket.on('bot:heartbeat', (data) => { /* update bot state */ });
socket.on('bot:status_changing', (data) => { /* multi-window sync */ });
```

Show a Live/Polling badge based on `socket.connected`. Fall back to 15s HTTP polling when disconnected.

---

## Environment Variable

```env
VITE_API_BASE_URL=https://your-brain-server.com/up-bot-brain-api
```

Configured in `vite.config.js` or `.env`. Read in `src/apis/axios.js` as `import.meta.env.VITE_API_BASE_URL`.

---

## Detailed Docs

- @README.md — Full pages reference, auth flow, Socket.IO events, deployment
