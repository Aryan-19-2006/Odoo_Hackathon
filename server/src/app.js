const express = require("express");

const app = express();

app.use(express.json({ limit: "10kb" }));

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : error.message,
  });
});

module.exports = app;
