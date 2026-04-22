/**
 * Express App Setup
 * Middlewares, routes, and global error handler are wired here.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");

// ─── Route Imports ───────────────────────────────────────────────
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const scanRoutes = require("./routes/scan.routes");
const app = express();

// ─── Global Middlewares ──────────────────────────────────────────
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookieParser());

// ─── API Routes ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/scans", scanRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.all("{*path}", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ─── Global Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
