# SecureScope

Security scanning & monitoring platform.

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** Zod
- **Queue:** BullMQ + ioredis
- **Security:** Helmet, bcryptjs, rate-limiter-flexible

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment
#    Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Start the dev server (auto-restart on changes)
npm run dev
```

## Project Structure

```
SecureScope/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── db.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── rbac.middleware.js
│   │   └── validate.middleware.js
│   ├── routes/
│   │   ├── user.routes.js
│   │   ├── record.routes.js
│   │   └── dashboard.routes.js
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── record.controller.js
│   │   └── dashboard.controller.js
│   ├── services/
│   │   ├── user.service.js
│   │   ├── record.service.js
│   │   └── dashboard.service.js
│   ├── validators/
│   │   ├── user.validator.js
│   │   └── record.validator.js
│   ├── utils/
│   │   ├── AppError.js
│   │   └── catchAsync.js
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint          | Description         |
| ------ | ----------------- | ------------------- |
| GET    | /api/health       | Health check        |
| GET    | /api/users        | List all users      |
| GET    | /api/users/:id    | Get user by ID      |
| GET    | /api/records      | List all records    |
| GET    | /api/records/:id  | Get record by ID    |
| POST   | /api/records      | Create a record     |
| GET    | /api/dashboard    | Dashboard analytics |
