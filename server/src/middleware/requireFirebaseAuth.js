const { getFirebaseAuth } = require("../modules/auth/firebaseAdmin");
const { User } = require("../modules/users/User");

const INVALID_TOKEN_ERROR_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-id-token",
  "auth/user-disabled",
  "auth/user-not-found",
]);

async function requireFirebaseAuth(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: "A valid Bearer token is required" });
  }

  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(match[1], true);
    const user = await User.findOne({ firebaseUid: decodedToken.uid })
      .select("_id firebaseUid email role isActive")
      .lean();

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "User account is unavailable" });
    }

    req.user = {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: decodedToken.email_verified === true,
    };

    return next();
  } catch (error) {
    if (INVALID_TOKEN_ERROR_CODES.has(error.code)) {
      return res.status(401).json({ error: "Invalid or revoked Firebase ID token" });
    }

    return next(error);
  }
}

module.exports = { requireFirebaseAuth };
