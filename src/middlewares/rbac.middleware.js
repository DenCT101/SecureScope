/**
 * RBAC Middleware
 * Checks if the user has permission for this action.
 * Usage: authorize("ADMIN", "MANAGER")
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user should be set by auth middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden — insufficient permissions" });
    }

    next();
  };
};

module.exports = { authorize };
