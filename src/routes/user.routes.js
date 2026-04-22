/**
 * User Routes — URL → Controller mapping
 */

const express = require("express");
const router = express.Router();
const { validate } = require("../middlewares/validate.middleware");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { registerSchema, loginSchema } = require("../validators/user.validator");


// POST /api/users/register
router.post("/register", validate(registerSchema), userController.registerUser);

router.post("/login", validate(loginSchema), userController.loginUser);

module.exports = router;
