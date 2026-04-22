/**
 * Auth Middleware
 * Verifies the user is who they say they are (e.g. JWT verification).
 */
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const authenticate = (req, res, next) => {
  // TODO: Implement JWT / session verification logic
  // Example:
  // const token = req.headers.authorization?.split(" ")[1];
  // if (!token) return res.status(401).json({ message: "Unauthorized" });
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // req.user = decoded;
  console.log("Authentication middleware");
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};

module.exports = { authenticate };
