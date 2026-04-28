# mr-upwork-bot-dashboard

Admin dashboard for MRUpworkBot. Built with React 19, Vite, shadcn/ui, and Tailwind CSS. Connects to the Brain API via REST and Socket.IO for real-time bot monitoring.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI Framework | React 19 + Vite 6 |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Charts | Recharts |
| HTTP | Axios (with silent token refresh interceptor) |
| Real-time | Socket.IO client |
| Toasts | Sonner |
| Icons | Lucide React |
| Date utils | date-fns |

---

## Prerequisites

- Node.js v18+
- Brain API running and reachable
- Valid user account created via `node scripts/createSuperAdmin.js` in the Brain repo

---

## Installation & Development

```bash
git clone <repo-url>
cd mr-upwork-bot-dashboard
npm install

# Configure API URL
# Edit vite.config.js or create .env:
echo "VITE_API_BASE_URL=https://your-brain-server.com/up-bot-brain-api" > .env

npm run dev
# Dashboard available at http://localhost:5173
```

---

## Environment Variables

```env
# Full base URL for the Brain API — must include /up-bot-brain-api
VITE_API_BASE_URL=https://your-brain-server.com/up-bot-brain-api
```

This is read in `src/apis/axios.js` as `import.meta.env.VITE_API_BASE_URL`.

---

## Building for Production

```bash
npm run build
# Output in dist/
```

The `dist/` folder is a static site. Upload to any static host or serve via nginx.

**nginx config snippet for Brain server (already configured):**
```nginx
location / {
    root /home/ubuntu/mr-upwork-bot-dashboard/dist;
    try_files $uri $uri/ /index.html;
}
```

---

## Deployment

Every push to `main` triggers CI/CD:
1. `npm run build`
2. Copy `dist/` to Lightsail via SSH
3. nginx serves the new build immediately (zero downtime)

---

## Project Structure

```
src/
├── App.jsx                    # Routes + PrivateRoute guards
├── main.jsx                   # Vite entry point
├── middleware.js              # Token storage helpers (getToken, setToken, clearToken)
├── apis/
│   ├── axios.js               # Axios instance — base URL + auth header + silent refresh
│   ├── auth.js                # login, refresh, logout, getMe, user management
│   ├── jobs.js                # getFilteredJobs, generateProposal, deleteAllJobs, reprocessJobs
│   ├── bots.js                # getBotStatuses, checkBotStatus, startBot, stopBot, resetBotStats
│   ├── analytics.js           # All analytics endpoints
│   ├── insights.js            # Market intelligence — categories, generate, status, report
│   ├── kb.js                  # Static knowledge base CRUD
│   ├── semanticKb.js          # embedAll, embedAllStatus
│   ├── playground.js          # BD Playground chat
│   ├── sraaSettings.js        # SRAA settings get/update
│   └── settings.js            # Global settings get/update
├── pages/
│   ├── login.jsx              # Login form
│   ├── logout.jsx             # Clears tokens + redirects
│   ├── jobsPage.jsx           # Main job browser — filters, sorting, export
│   ├── JobDetailPage.jsx      # Single job full view
│   ├── botMonitor.jsx         # Scraper Monitor — real-time bot status, start/stop
│   ├── analyticsPage.jsx      # Analytics dashboard — 12+ charts
│   ├── MarketIntelligence.jsx # AI market intelligence reports per category
│   ├── relevanceSettings.jsx  # Unified Settings page (8 tabs)
│   ├── StaticKnowledgeBase.jsx # Profile keywords + portfolio projects
│   ├── SemanticKnowledgeBase.jsx # Embed All flow + embedding status
│   ├── SRAASettings.jsx       # AI/RAG config (models, temperatures, prompts)
│   ├── Playground.jsx         # BD Playground — multi-turn RAG chat
│   ├── UserManagement.jsx     # User management (superAdmin only)
│   ├── GlobalSettings.jsx     # Legacy (merged into Settings tabs)
│   └── notFound.jsx           # 404 page
└── components/
    ├── jobCard.jsx             # Job card with scores, proposal generation
    ├── botSummaryCard.jsx      # Single bot status card
    ├── botSettingsModal.jsx    # Edit bot operational settings
    ├── profileEditor.jsx       # Keyword + weight editor for a profile
    ├── ProjectCard.jsx         # Portfolio project card
    ├── ProjectModel.jsx        # Create/edit project modal
    ├── sidebar.jsx             # Navigation sidebar
    ├── topbar.jsx              # Top bar (user info, role badge)
    ├── layout.jsx              # Sidebar + topbar wrapper
    ├── privateRoute.jsx        # Route guard (redirects to /login if no token)
    └── ui/                     # shadcn/ui components (Button, Input, Dialog, etc.)
```

---

## Pages Reference

### Jobs Page (`/jobs`)
The main job browser.

**Features:**
- **Filters:** Matched Profile, Semantic Verdict, Experience Level, Min Relevance Score, Client Quality, Category (multi-select), Country (multi-select), full-text search
- **Sorting:** by Relevance Score, Date Posted, Semantic Score
- **Export:** Download currently loaded jobs as CSV or JSON (client-side, no API call)
- **Job count badge** showing filtered vs total job counts

**Job Card features:**
- Relevance score breakdown (keyword / field / semantic) with tooltips
- Expand/collapse full description
- Generate AI proposal (Short / Medium / Detailed)
- Editable proposal textarea + Copy to Clipboard + Regenerate
- Open job on Upwork in new tab

---

### Scraper Monitor (`/bots`)
Real-time monitoring and control of all scraper bots.

**Features:**
- **Live updates via Socket.IO** — status changes appear instantly (no polling lag)
- Live/Polling badge per bot showing socket connection state
- Per-bot status: Agent status (keep-alive), Scraper status (heartbeat), health pill
- Start / Stop buttons (disabled when agent is offline)
- Cycle timing: last cycle duration, avg cycle duration, idle countdown
- Hard Refresh button — reloads all bots and rebuilds idle countdown
- Bot Settings modal — edit search queries, delays, max jobs per cycle

---

### Analytics (`/analytics`)
Aggregated job statistics with 12+ charts.

**Charts:**
- Jobs over time (line)
- Score distribution (bar histogram)
- Top countries / categories (horizontal bar) — expandable to Top 10/25/50/100
- Profile breakdown (pie)
- Pricing split (donut)
- Emerging keywords (bar)
- Posting heatmap (7×24 SVG grid)
- Hourly distribution
- Semantic verdict breakdown
- Budget distribution
- Experience level breakdown

All charts are cached server-side for 1 hour. Use **Flush Cache** to force refresh.

---

### Market Intelligence (`/market-intelligence`)
AI-generated deep-dive reports per job category.

**How it works:**
1. Select a category from the grid
2. Choose sample size (100 / 250 / 500 / 750 / 1000 jobs)
3. Click Generate — live progress badge shows pipeline stages
4. View cached report (free on subsequent views — no API cost)

**Report sections:**
- Executive Summary, Top Skills, Tools & Technologies, Deliverables
- Client Industries, Client Profile, Budget Insights
- Portfolio Recommendations, Market Trends, Strategic Recommendations

---

### Settings (`/relevance-settings`)
Unified settings panel with 8 tabs:

| Tab | Content |
|-----|---------|
| **Static Relevance** | Per-profile keyword lists + scoring weights |
| **AI Models & RAG** | Model selection, top-K, temperatures, min static score |
| **Scoring Prompt** | System prompt for gpt-4o-mini semantic scoring |
| **Proposal Prompts** | Short / Medium / Detailed proposal system prompts |
| **Playground Prompt** | BD Playground system prompt |
| **Rewrite Prompts** | Project semantic rewrite + portfolio rewrite prompts |
| **Notifications** | Slack webhook config + alert thresholds |
| **Scraper Configs** | Global category store (name + Upwork URL pairs) |

---

### Static Knowledge Base (`/static-knowledge-base`)
Manage relevance profiles and portfolio projects.

**Profiles:** Create/edit profiles with keyword lists and field scoring weights.  
**Projects:** Add portfolio projects → AI rewrite → Approve → auto-embed.  
**Embed All:** Re-embed all approved projects; live progress badge during bulk embedding.

---

### BD Playground (`/playground`)
Multi-turn RAG chat grounded in your approved project portfolio.

- Select a profile for context
- Ask anything about your capabilities, past work, or proposal strategy
- Context panel (desktop) shows which projects were used as RAG sources
- Copy individual responses to clipboard

---

### User Management (`/user-management`)
SuperAdmin-only. Manage all dashboard users.

- List all users with role badges
- Create users (email, password, role)
- Delete users
- Toggle active/inactive
- Change password
- Change role

---

## Authentication

The app uses JWT with silent refresh:

1. Login → `accessToken` stored in memory, `refreshToken` in `localStorage`
2. Every request adds `Authorization: Bearer <accessToken>`
3. On 401 response: axios interceptor calls `/auth/refresh` automatically
4. New `accessToken` is applied and the original request retried — transparent to the user
5. Logout clears both tokens from memory and localStorage

**Roles:**
| Role | Access |
|------|--------|
| `user` | All pages except User Management |
| `admin` | + can create users |
| `superAdmin` | Full access including User Management |

---

## API Layer (`src/apis/`)

All API files export async functions that call the configured axios instance.

**`axios.js`** — single axios instance with:
- `baseURL` from `VITE_API_BASE_URL`
- Request interceptor: attaches current `accessToken`
- Response interceptor: on 401 → silently refresh → retry

**Example usage in a component:**
```js
import { getFilteredJobs } from '../apis/jobs';

const { data } = await getFilteredJobs({
  search: 'React developer',
  minScore: 50,
  verdict: 'Yes',
  limit: 100,
});
const { jobs, total, totalAll } = data.data;
```

---

## Real-time (Socket.IO)

`botMonitor.jsx` connects to:
```
wss://your-brain-server.com/up-bot-brain-api/socket.io
```

**Events listened to:**
- `bot:heartbeat` — updates bot status/fields instantly in UI state
- `bot:command_ack` — confirms stop command was received by agent
- `bot:status_changing` — multi-window sync when another dashboard window triggers start/stop

**Live/Polling badge:**
- 🟢 **Live** — socket connected; updates are real-time
- 🟡 **Polling** — socket disconnected; falls back to 15-second HTTP poll

---

## Adding New Pages

1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`:
   ```jsx
   <Route path="/my-page" element={<PrivateRoute><Layout><MyPage /></Layout></PrivateRoute>} />
   ```
3. Add nav link in `src/components/sidebar.jsx`
4. Add API functions in `src/apis/myPage.js` if needed

**Style rules:**
- Tailwind only — no inline styles, no CSS modules
- Use shadcn/ui components from `src/components/ui/` for all interactive elements
- Mobile-first: use `sm:`, `md:`, `lg:` prefixes for responsive layouts
- `overflow-x-auto` + `min-w-max` for tables and tab bars that may overflow on mobile
