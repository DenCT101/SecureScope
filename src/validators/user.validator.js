const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase().nonempty("Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters").trim().nonempty("Password is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase().nonempty("Email is required"),
  password: z.string().min(1, "Password is required").trim().nonempty("Password is required"),
});

module.exports = { registerSchema, loginSchema };
