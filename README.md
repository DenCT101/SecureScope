# SecureScope 🔍

**SecureScope** is a modern, automated web security scanner featuring a "Local-First OSS Architecture" and AI-powered vulnerability explanations.

It is designed for developers, small businesses, and startups who want a completely free, infinitely scalable, and highly private security scanning orchestration tool. By running the backend locally and supplying your own AI keys, you get premium-level security insights with zero vendor lock-in and zero server costs.

🌟 **Live Demo:** [https://secure-scope-alpha.vercel.app](https://secure-scope-alpha.vercel.app)  
*(Note: To test the live demo, you must have the backend running locally on your machine. See the Installation section below.)*

## 🚀 The "Local-First OSS" Architecture

SecureScope is split into two parts:

1. **The Frontend (Hosted on Vercel):** The beautiful, cyberpunk-themed React UI is hosted publicly.
2. **The Backend (Hosted by YOU):** The Express API, PostgreSQL database, and heavy security scanners (Nikto, Nmap) run locally on your own machine via a single Docker command. 

When you visit the public frontend and click "Scan", **the website routes the API requests back to your locally running Docker container** (`http://localhost:3000`). Your scan data never leaves your computer!

## 🤖 Bring Your Own Key (BYOK)

To translate raw terminal output from scanners into plain-English remediation steps, SecureScope uses Google's Gemini AI.
To keep the software completely free, we use a **BYOK** model. 
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Paste it into the Settings panel in the SecureScope UI.
3. The key is stored locally in your browser and used strictly for your scans. It is scrubbed from the database immediately after use.

---

## 🛠️ Getting Started (Installation)

You only need **Docker** installed on your machine.

1. Clone this repository:
```bash
git clone https://github.com/DenCT101/SecureScope.git
cd SecureScope
```

2. Create a `.env` file in the root directory and add your Postgres URL (you can use a free database from Supabase or Neon):
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

3. Spin up the backend and background workers:
```bash
docker-compose up -d --build
```
*Note: We mount the Docker socket (`/var/run/docker.sock`) into the container so SecureScope can dynamically spawn containerized security scanners.*

4. Visit the frontend:
- **Local Dev:** `http://localhost:5173`
- **Production:** `https://securescope.vercel.app` (Make sure the Vercel app is deployed pointing to `http://localhost:3000/api`)

---

## 🏗️ Tech Stack

- **Frontend:** React, Vite, Vanilla CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL managed via Prisma ORM
- **Task Queue:** Custom atomic PostgreSQL queue (`SKIP LOCKED` alternative via `UPDATE RETURNING`)
- **Scanners:** Containerized instances spawned via `child_process.exec`
- **AI Translation:** Google Gemini (Flash)

## 📡 Included Scanners

Currently, SecureScope orchestrates:
- ✅ **Nikto** (Web server vulnerability scanner)
- ⏳ **Nmap** (Coming soon - Network mapper)
- ⏳ **Semgrep** (Coming soon - SAST code scanning)
