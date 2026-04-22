/**
 * Record Routes — URL → Controller mapping
 */

const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scan.controller");
const { validate } = require("../middlewares/validate.middleware");
const { createScanSchema } = require("../validators/scan.validator");
const { authenticate } = require("../middlewares/auth.middleware");

router.post("/", authenticate, validate(createScanSchema), scanController.createScan);
router.get("/", authenticate, scanController.getAllScans);
router.get("/:id", authenticate, scanController.getScanById);

module.exports = router;
