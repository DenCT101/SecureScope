# SecureScope Frontend — React Dashboard

## Goal
Build a React dashboard inside the existing monorepo (`SecureScope/client/`) that consumes the Express API. The user will learn React fundamentals while building a real application.

## React Crash Course — What You Need to Know First

Before we touch any code, here are the 5 React concepts you'll use in this project:

### 1. Components
In vanilla HTML, you write one giant page. In React, you break the page into **reusable building blocks** called components.

```
Dashboard Page
├── Navbar          (component)
├── ScanList        (component)
│   ├── ScanCard    (component) × many
│   └── ScanCard    (component) × many
└── Footer          (component)
```

Each component is just a JavaScript function that returns HTML-like syntax (called JSX).

### 2. State (`useState`)
State is a variable that, when changed, **automatically re-renders the screen**. In vanilla JS, you'd manually do `document.getElementById(...).innerText = newValue`. In React, you just change the variable and the screen updates itself.

```javascript
const [scans, setScans] = useState([]);  // starts as empty array
// When setScans([...data]) is called, the UI instantly re-renders with the new data
```

### 3. Effects (`useEffect`)
This is how you run code when a page first loads (like fetching data from your API).

```javascript
useEffect(() => {
  fetch('/api/scans').then(res => res.json()).then(data => setScans(data));
}, []);  // The empty [] means "run this once when the component first appears"
```

### 4. Props
How you pass data DOWN from a parent component to a child component.

```javascript
// Parent passes scan data to child
<ScanCard scan={scanObject} />

// Child receives and uses it
function ScanCard({ scan }) {
  return <div>{scan.url} — {scan.status}</div>
}
```

### 5. React Router
How you navigate between pages without the browser reloading (like a mobile app).

```
/login        → shows LoginPage component
/dashboard    → shows DashboardPage component
/scans/:id    → shows ScanResultPage component
```

> [!IMPORTANT]
> That's it. These 5 concepts (Components, State, Effects, Props, Router) are 90% of what you need. Everything else is built on top of these.

---

## Architecture

```
SecureScope/
├── src/                    ← Your Express API (already exists)
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── workers/
│   └── scanners/
├── client/                 ← NEW: React frontend
│   ├── src/
│   │   ├── main.jsx           ← Entry point (mounts the React app)
│   │   ├── App.jsx            ← Root component (defines routes)
│   │   ├── index.css          ← Global styles + design system
│   │   ├── pages/             ← Full-page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── NewScanPage.jsx
│   │   │   └── ScanResultPage.jsx
│   │   ├── components/        ← Reusable UI pieces
│   │   │   ├── Navbar.jsx
│   │   │   ├── ScanCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── VulnerabilityRow.jsx
│   │   └── services/          ← API call functions
│   │       └── api.js         ← fetch() wrappers for your Express API
│   ├── index.html
│   ├── package.json
│   └── vite.config.js         ← Proxy config so /api calls go to Express
├── package.json            ← Root (Express API)
└── docker-compose.yml      ← Future: boots everything together
```

### How the Frontend Talks to the Backend

```
Browser (React on localhost:5173)
    │
    │  fetch('/api/scans')
    │
    ▼
Vite Dev Server (localhost:5173)
    │
    │  Proxy: "/api" → "http://localhost:3000"
    │
    ▼
Express API (localhost:3000)
    │
    ▼
PostgreSQL (Supabase)
```

Vite's dev server acts as a middleman. When your React code calls `fetch('/api/scans')`, Vite intercepts it and forwards it to your Express server on port 3000. This avoids CORS issues entirely during development.

---

## Pages to Build (in order)

### Page 1: Login + Register
- Two forms: email + password
- On success, the API sets a JWT cookie automatically
- Redirect to Dashboard after login

**React concepts learned:** Components, useState (form inputs), useEffect, fetch()

### Page 2: Dashboard (Scan History)
- Shows a list of all scans belonging to the logged-in user
- Each scan shows: URL, tool type, status badge (color-coded), date
- Click a scan → navigates to its result page
- "New Scan" button in top-right corner

**React concepts learned:** useEffect (fetch on load), .map() to render lists, React Router navigation

### Page 3: New Scan
- Form with: URL input field + tool type dropdown (NIKTO / SEMGREP)
- Submit button → POST to `/api/scans` → redirect to Dashboard
- The new scan appears as PENDING, then the worker picks it up

**React concepts learned:** Controlled form inputs, POST requests with fetch(), redirect after submit

### Page 4: Scan Results
- Shows scan metadata (URL, status, tool, timestamps)
- Lists each vulnerability with: severity badge, message, translated text
- Raw data expandable/collapsible (accordion)

**React concepts learned:** Dynamic routes (`/scans/:id`), useParams(), conditional rendering

### Page 5: Setup Wizard (First-Time Experience)
- Detects if the user has configured their Gemini API key
- Step-by-step guide with screenshots
- Input field to paste API key
- Saves it securely via API call

**React concepts learned:** Multi-step forms, conditional page rendering

---

## Design Direction

A dark-themed, cybersecurity-inspired dashboard:
- Dark background (#0a0a0f) with subtle grid patterns
- Neon accent colors (cyan/green for safe, red/orange for vulnerabilities)
- Glassmorphism cards with subtle borders
- Monospace font for technical data, clean sans-serif for UI text
- Smooth animations on status changes

---

## Build Order

| Step | What | Files |
|---|---|---|
| 1 | Initialize Vite + React project in `client/` | `client/*` |
| 2 | Set up design system (CSS variables, fonts, base styles) | `index.css` |
| 3 | Create API service layer | `services/api.js` |
| 4 | Build Login + Register pages | `pages/LoginPage.jsx`, `pages/RegisterPage.jsx` |
| 5 | Build Navbar + routing | `App.jsx`, `components/Navbar.jsx` |
| 6 | Build Dashboard page | `pages/DashboardPage.jsx`, `components/ScanCard.jsx` |
| 7 | Build New Scan page | `pages/NewScanPage.jsx` |
| 8 | Build Scan Results page | `pages/ScanResultPage.jsx`, `components/VulnerabilityRow.jsx` |
| 9 | Polish: animations, responsive design, loading states | Various |

---

## Open Questions

> [!IMPORTANT]
> 1. **Auth cookies:** Your Express API sets JWT via `httpOnly` cookies. Does your current CORS config allow `credentials: 'include'`? We'll need to verify this before the frontend can authenticate.
> 2. **Do you want to learn CSS from scratch for this** (writing your own styles), or use a component library like **Shadcn/UI** or **Chakra UI** to speed things up? Writing your own CSS teaches you more, but takes longer.
