/**
 * Dashboard Controller — Handles HTTP concerns (req/res), delegates to services
 */

const catchAsync = require("../utils/catchAsync");
const dashboardService = require("../services/dashboard.service");

const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getDashboardStats();
  res.status(200).json({ status: "success", data: stats });
});

module.exports = { getDashboardStats };
