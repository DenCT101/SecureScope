/**
 * User Controller — Handles HTTP concerns (req/res), delegates to services
 */

const catchAsync = require("../utils/catchAsync");
const userService = require("../services/user.service");
const jwt = require("jsonwebtoken");

const registerUser = catchAsync(async (req, res) => {
  const user = await userService.registerUser(req.body.email, req.body.password);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(201).json({ status: "success", data: user });
});

const loginUser = catchAsync(async (req, res) => {
  const user = await userService.loginUser(req.body.email, req.body.password);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ status: "success", data: user });
});

module.exports = { registerUser, loginUser };
