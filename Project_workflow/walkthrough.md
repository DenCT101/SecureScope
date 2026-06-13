# SecureScope Backend Study Guide

To master this project so deeply that you can build it yourself from scratch, we must break it down into logical "Layers". This guide maps out the entire architecture. We will use this as our curriculum to go through the codebase line-by-line.

## 1. The Foundation Layer (Server & Config)
*How does an Express server actually boot up?*
- **`src/server.js`**: The absolute entry point. Loads `.env` and starts listening on a port.
- **`src/app.js`**: The Express application brain. This is where global middlewares (Helmet, CORS, Cookie-Parser) and the Global Error Handler live.
- **`src/config/db.js`**: Instantiates the Prisma Client. This is our bridge to the PostgreSQL database.

## 2. The Request Lifecycle (Routes → Controllers → Services)
*When a user clicks a button on the frontend, how does the backend process it?*
We use the **Service-Controller-Route** pattern (often called 3-Tier Architecture).
- **`src/routes/*.routes.js`**: The Traffic Cop. Maps a URL (e.g., `/api/scans`) to a specific function.
- **`src/middlewares/`**: The Bouncers. They intercept the request to check Auth, API Keys, or validate JSON payload shapes (Zod).
- **`src/controllers/*.controller.js`**: The Manager. Unpacks the HTTP request, hands the data to a Service, and sends the HTTP response (200 OK) back to the user.
- **`src/services/*.service.js`**: The Worker. This is where the actual *business logic* lives (saving to DB, calling external APIs).

## 3. The Security & Cryptography Layer
*How do we protect user data?*
- **`src/services/user.service.js` (Passwords)**: Uses `bcrypt` for slow, salt-based hashing to protect passwords from brute-force attacks.
- **`src/services/apikey.service.js` (API Keys)**: Uses Node's native `crypto` module with fast SHA-256 one-way hashing to store API keys. 
- **`src/middlewares/auth.middleware.js`**: JWT (JSON Web Token) cookie validation.

## 4. The Postgres Maximalist Queue
*How do we run 5-minute security scans without freezing the Express server?*
- **`src/workers/scanner.worker.js`**: The background process. Uses `setInterval` to act as a heartbeat.
- **`SELECT ... FOR UPDATE SKIP LOCKED`**: The magic SQL command that turns a standard Postgres database into a high-concurrency message queue, completely replacing the need for Redis or BullMQ.

## 5. The External Integration Layer (Docker & LLMs)
*How does the backend talk to the outside world?*
- **`src/scanners/nikto.scanner.js`**: Uses Node's `child_process.exec` to spawn terminal commands. This forces Docker to download and run the Nikto security image, then captures the terminal output.
- **`src/services/llm.service.js`**: The AI Brain. Uses the Google Generative AI SDK with a **Batched Prompt Strategy** to translate 50 vulnerabilities in a single HTTP request without hitting rate limits.

---

### How to use this guide:
Pick a layer from the list above. I will bring up the core files from that layer, and we will walk through them block-by-block. You can ask "Why did we write this specific line?" or "What happens if I change this to X?". 
