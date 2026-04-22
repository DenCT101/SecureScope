# SecureScope

**SecureScope** is a "Lite-SOAR" (Security Orchestration, Automation, and Response) platform designed specifically for small businesses and startups. 

Small businesses and startups are often the most susceptible to cyber-attacks due to minor vulnerabilities that go unnoticed, or simply because they don't have the specialized knowledge required to fix them. SecureScope bridges this gap by automatically orchestrating security checks and leveraging AI to decipher complex scanner outputs, transforming technical jargon into actionable, easy-to-understand recommendations.

## Core Features

- **Lite-SOAR Architecture:** Automates the orchestration of various underlying security scanning scripts.
- **AI-Powered Simplification:** Uses Artificial Intelligence to summarize raw, complex vulnerability data so non-experts can easily understand what the problem is and how to fix it.
- **Focused on the Underserved:** Built with the acknowledgment that small businesses need straightforward guidance, not just a list of CVE codes.

## Security Scanners

Currently, SecureScope integrates with the following open-source security tools:
- ✅ **Nikto** (Web server scanner)

**Future Roadmap:** We plan to integrate **10+ additional open-source security tools** to broaden the platform's detection capabilities (e.g., Nmap, OpenVAS, OWASP ZAP) covering network scanning, web app vulnerabilities, and misconfigurations.

---

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** Zod
- **Queue / Background Jobs:** BullMQ + ioredis (for scaling scanner tasks)
- **Security:** Helmet, bcryptjs, rate-limiter-flexible

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment
#    Edit .env with your DATABASE_URL, JWT_SECRET, REDIS connection, etc.

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Start the dev server (auto-restart on changes)
npm run dev

# 6. Start the scanner worker (in a separate terminal)
npm run worker
```

## Project Structure

```
SecureScope/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── config/               # Database and environment configurations
│   ├── middlewares/          # Auth, Validate, and RBAC middlewares
│   ├── routes/               # Express API routes
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── scanners/             # Scanner executor scripts (e.g., nikto.scanner.js)
│   ├── workers/              # Background job processors (e.g., scanner.worker.js)
│   ├── validators/           # Zod parameter validation schemas
│   ├── utils/                # Error handling and utilities
│   ├── app.js                # Express app setup
│   └── server.js             # HTTP server entry point
├── .env
├── .gitignore
└── README.md
```

## API Endpoints Overview

| Method | Endpoint               | Description                                  |
| ------ | ---------------------- | -------------------------------------------- |
| GET    | /api/health            | System health check                          |
| GET    | /api/users             | List users (Admin)                           |
| GET    | /api/scans             | List security scans                          |
| POST   | /api/scans             | Initiate a new security scan                 |
| GET    | /api/dashboard         | Dashboard analytics & metrics aggregations   |
