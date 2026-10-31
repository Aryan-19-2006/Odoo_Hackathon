const mongoose = require("mongoose");

async function connectToDatabase() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
  return mongoose.connection;
}

module.exports = { connectToDatabase };
