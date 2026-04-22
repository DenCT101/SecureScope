/**
 * Record Controller — Handles HTTP concerns (req/res), delegates to services
 */

const catchAsync = require("../utils/catchAsync");
const scanService = require("../services/scan.service");

const createScan = catchAsync(async (req, res) => {
  const scan = await scanService.createScan(req.user.id, req.body);
  res.status(202).json({ status: "queued", data: scan });
});

const getAllScans = catchAsync(async (req, res) => {
  const scans = await scanService.getAllScans(req.user.id);
  res.status(200).json({ status: "success", data: scans });
});

const getScanById = catchAsync(async (req, res) => {
  const scan = await scanService.getScanById(req.params.id);
  res.status(200).json({ status: "success", data: scan });
});

module.exports = { createScan, getAllScans, getScanById };
