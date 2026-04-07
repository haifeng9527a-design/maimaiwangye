const { verifyAdminToken } = require("./utils");

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return res.status(401).json({ error: "Missing admin token." });
  }

  try {
    req.admin = verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired admin token." });
  }
}

module.exports = {
  requireAdmin
};
