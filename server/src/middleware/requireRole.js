const { USER_ROLES } = require("../modules/users/User");

function requireRole(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !USER_ROLES.includes(role))
  ) {
    throw new Error("requireRole must be configured with one or more valid user roles");
  }

  return function authorizeRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication is required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}

module.exports = { requireRole };
