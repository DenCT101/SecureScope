/**
 * Scan Routes — URL → Controller mapping
 * Local-first mode: no auth middleware required.
 */

const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scan.controller");
const { validate } = require("../middlewares/validate.middleware");
const { createScanSchema } = require("../validators/scan.validator");

router.post("/", validate(createScanSchema), scanController.createScan);
router.get("/", scanController.getAllScans);
router.get("/:id", scanController.getScanById);

module.exports = router;
