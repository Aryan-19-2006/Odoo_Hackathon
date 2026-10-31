require("dotenv").config();

const app = require("./app");
const { initializeFirebaseAdmin } = require("./modules/auth/firebaseAdmin");
const { connectToDatabase } = require("./config/database");

async function startServer() {
  initializeFirebaseAdmin();
  await connectToDatabase();

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Backend startup failed:", error);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
