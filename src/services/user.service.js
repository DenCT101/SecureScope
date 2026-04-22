/**
 * User Service — Business logic for user operations
 */

const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");


const registerUser = async (email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, password: hashedPassword },
  });
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("User not found", 404);
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new AppError("Invalid password", 401);
  return user;
};

module.exports = { registerUser, loginUser };
