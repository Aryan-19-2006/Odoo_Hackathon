const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { requireFirebaseAuth } = require("./middleware/requireFirebaseAuth");
const { initializeFirebaseAdmin } = require("./modules/auth/firebaseAdmin");

function getAuthenticateMiddleware() {
  const authModulePath = process.env.MEMBER1_AUTH_MODULE;
  if (!authModulePath) {
    initializeFirebaseAdmin();
    return requireFirebaseAuth;
  }

  const authModule = require(path.resolve(authModulePath));
  if (typeof authModule.authenticate !== "function") {
    throw new TypeError(
      "MEMBER1_AUTH_MODULE must export an authenticate middleware",
    );
  }

  return authModule.authenticate;
}

async function start() {
  const authenticate = getAuthenticateMiddleware();
  await connectDatabase();

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const app = createApp({ authenticate });
  return app.listen(port, () => {
    console.log(`Brightloop API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Unable to start Brightloop API", error);
    process.exitCode = 1;
  });
}

module.exports = { start, startServer: start };
