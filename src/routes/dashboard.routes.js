/**
 * Dashboard Routes — URL → Controller mapping
 */

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

// GET /api/dashboard
router.get("/", dashboardController.getDashboardStats);

module.exports = router;
