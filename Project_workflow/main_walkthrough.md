# SecureScope: Architecture & Engineering Masterclass

Welcome! As a Senior Engineer, one of the most important things I can teach you isn't just *how* to write code, but *why* we write it a certain way. Software engineering is entirely about **tradeoffs**. Every time you make a choice, you gain something and lose something else. 

In this lesson, we will walk through every corner of the SecureScope codebase, unraveling the decisions we made and exploring the fundamentals of Docker and Vercel.

---

## 1. The Big Picture: "Local-First OSS" Architecture

When we started, SecureScope looked like a traditional **SaaS (Software as a Service)**. It had user accounts, login screens, encrypted passwords, and database tables mapping users to their API keys.

We pivoted to a **Local-First Open Source Software (OSS)** architecture. 

### What does that mean?
Instead of us paying thousands of dollars to host servers, databases, and heavy Docker containers for thousands of users in the cloud, **the user runs the heavy lifting on their own computer**. We only host the lightweight frontend UI on the web.

### The Tradeoff
> [!TIP]
> **SaaS Approach**
> - **Pros:** User just visits a website and clicks a button. Zero friction.
> - **Cons:** You (the developer) pay massive server bills. Running `docker run nikto` for thousands of users requires huge cloud infrastructure.

> [!TIP]
> **Local-First Approach (What we built)**
> - **Pros:** Literally $0 server costs for you. Infinite scalability. Total privacy for the user (their scan data never leaves their laptop).
> - **Cons:** The user has to run a terminal command (`docker-compose up`) to use the app.

By choosing Local-First, we optimized for **cost and privacy**. 

---

## 2. The Great Auth Purge

Because the app runs locally on the user's laptop, **there is only one user: the person sitting at the keyboard.** 

Having a login screen, JWT (JSON Web Tokens), password hashing (`bcrypt`), and user database tables became "deadweight." If I am running the app on my own private `localhost`, why do I need to log in to prove I am me?

**What we changed:**
- We deleted 11 backend files related to user management and authentication.
- We removed the `User` model from `schema.prisma`.
- We removed the login and register pages from the React frontend.

**The Lesson:** YAGNI (You Aren't Gonna Need It). In engineering, deleting code is often better than writing code. Less code means fewer bugs, less maintenance, and a faster application.

---

## 3. Bring Your Own Key (BYOK)

To use Google's Gemini AI, we need an API key. 
If we hardcoded *our* API key into the app, users would drain our free quota in minutes, and we'd be hit with a massive bill.

**The Solution: BYOK**
We created a Settings panel in the UI where the user pastes *their own* free Gemini API key. 

**How it works under the hood:**
1. The React frontend saves the key in `localStorage` (the browser's built-in memory).
2. When the user clicks "Launch Scan", React sends the key in the HTTP request body to our backend.
3. Our backend attaches the key to the scan job in the database.
4. The background worker reads the key, uses it *once* to call Gemini, and then **immediately overwrites it with `null` in the database**.

**The Tradeoff:**
We sacrifice a tiny bit of user convenience (they have to go get an API key once) in exchange for ensuring we never have to pay for their AI usage, and we maintain high security by actively scrubbing the key from our database.

---

## 4. The Worker Queue & Database

You noticed we kept **PostgreSQL** instead of switching to a simpler file-based database like SQLite.

### Why PostgreSQL? The Queue Magic
SecureScope has a **Background Worker** (`scanner.worker.js`). Its job is to constantly check the database: *"Are there any new scans pending?"* 

Imagine you launch 5 scans at once, and you run 3 workers in parallel to process them faster. How do you prevent all 3 workers from accidentally grabbing the *exact same scan*?

This is called a **Race Condition**. 

PostgreSQL gives us a magical SQL feature to solve this: `SELECT ... FOR UPDATE SKIP LOCKED`.
- `FOR UPDATE`: Locks the row so no one else can touch it.
- `SKIP LOCKED`: If another worker already locked row #1, don't wait in line—just skip it and grab row #2!

This allows us to build a lightning-fast, deadlock-free queue without needing to install heavy queueing software like Redis or RabbitMQ. SQLite doesn't support row-level locking, which is why we stuck with Postgres!

---

## 5. Docker & Containerization Explained

### What is Docker?
Imagine you write a program that requires Node.js v20, Python 3.9, a specific version of a C++ compiler, and 5 different environment variables. If you give that to a friend, it might take them 3 hours to install all that junk just to run your code. ("It works on my machine!")

**Docker solves this using "Containers."** A container is like a mini, isolated, invisible virtual computer. You package your code *along with the exact operating system and dependencies it needs* into an "Image". Anyone with Docker can run that Image, and it will behave exactly identically on a Mac, Windows, or Linux machine.

### Breaking down our `Dockerfile`
A `Dockerfile` is a recipe to build that Image.

```dockerfile
# 1. Start with a tiny Linux operating system that already has Node.js installed.
FROM node:20-alpine

# 2. Install the Docker CLI inside this container (we'll explain why below).
RUN apk add --no-cache docker-cli

# 3. Create a folder named /app inside the container and move into it.
WORKDIR /app

# 4. Copy our package.json from our laptop into the container.
COPY package*.json ./
COPY prisma ./prisma/

# 5. Run npm install INSIDE the container to download dependencies.
RUN npm install
RUN npx prisma generate

# 6. Copy the rest of our source code in.
COPY src ./src
COPY start.sh ./
RUN chmod +x ./start.sh

# 7. When the container starts, run this script.
CMD ["./start.sh"]
```

### Breaking down `docker-compose.yml`
While a `Dockerfile` builds *one* container, `docker-compose` is an orchestrator. It manages starting, stopping, and linking containers.

```yaml
services:
  securescope-backend:
    build: .             # Build the Dockerfile in this directory
    ports:
      - "3000:3000"      # Map port 3000 on my laptop to port 3000 in the container
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### 🤯 The Secret Sauce: Docker-in-Docker via Socket Mounting
This is the most advanced and coolest part of our setup:
```yaml
- /var/run/docker.sock:/var/run/docker.sock
```
Our Node.js app uses `child_process.exec` to run Nikto scans using Docker: `docker run --rm frapsoft/nikto`.

But wait... our Node.js app is *already inside a Docker container*. How can a Docker container run *another* Docker container? 

The `/var/run/docker.sock` is the "steering wheel" of the Docker engine on your host laptop. By mounting this socket into our container, we give our Node.js app permission to reach outside of its box, grab the steering wheel of the laptop's Docker engine, and spin up "sibling" containers for Nikto and Nmap right next to it! 

---

## 6. Vercel & The Frontend Magic

**Vercel** is a cloud hosting platform specifically optimized for frontend frameworks like React, Next.js, and Vue. 

### How Single Page Applications (SPAs) Work
Your React app is technically just one single HTML file (`index.html`) and a massive JavaScript file. When you click around the app (e.g., from `/login` to `/dashboard`), your browser *isn't actually fetching new pages from a server*. React intercepts the click, changes the URL in the address bar, and instantly re-draws the screen using JavaScript.

### The Problem with Vercel
If a user goes directly to `https://securescope.vercel.app/settings` and hits Enter, Vercel looks in its folders for a file named `settings.html`. It doesn't exist! So Vercel returns a 404 Error.

### The Fix: `vercel.json`
We wrote this configuration file:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This tells Vercel: *"No matter what URL the user types in, just send them the `index.html` file."* Once the browser loads `index.html`, React wakes up, looks at the URL, and says "Oh, they want the Settings page, I'll draw that now!"

### The "API_BASE" Trick
Remember how our backend runs locally via Docker, but the frontend is hosted on Vercel? How do they talk?

Look at the code we wrote in `client/src/services/api.js`:
```javascript
const API_BASE = import.meta.env.PROD 
  ? 'http://localhost:3000/api' 
  : '/api';
```
When Vercel builds your production code (`import.meta.env.PROD`), it hardcodes `http://localhost:3000/api` into the JavaScript. 

When User A visits your website on Vercel, their browser downloads the JavaScript. When they click "Scan", **their browser** makes an HTTP request to `localhost:3000`. Because `localhost` always means "the computer you are currently on", the request goes from User A's browser directly to the Docker container running on User A's laptop! 

It's brilliant because Vercel hosts the UI, but we offload 100% of the API traffic and scanning CPU usage back to the user.

---

## Conclusion
You now have an incredibly modern, cost-effective, and scalable architecture:
1. **Frontend:** Hosted infinitely and for free on Vercel.
2. **Backend:** Packaged perfectly into a portable Docker container.
3. **Queue:** Powered by robust PostgreSQL locking mechanisms.
4. **Scanners:** Isolated via Docker socket mounting.
5. **AI:** Powered by the user's own BYOK API key.

When building future projects, always ask yourself first: *What are the tradeoffs? Who is paying for the compute? Can I simplify this?* 

Great engineers don't just build complex things; they build the simplest things that perfectly solve the problem.
