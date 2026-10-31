const express = require("express");
const { createApiRouter } = require("./routes");

function createApp({ authenticate }) {
  if (typeof authenticate !== "function") {
    throw new TypeError("Member 1 authentication middleware must be supplied");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createApiRouter({ authenticate }));
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const statusCode = error.statusCode || error.status;
    if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
      return res.status(statusCode).json({ error: error.message });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: "A record with the same unique value already exists",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError" ||
      error.type === "entity.parse.failed"
    ) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Unhandled API error", error);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
