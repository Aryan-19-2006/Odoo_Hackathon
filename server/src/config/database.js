async function connectDB() {
  console.log("DUMMY DB mode - MongoDB bypassed");
  return;
}

async function connectDatabase() {
  console.log("DUMMY DB mode - MongoDB bypassed");
  return;
}

function getDB() {
  return null;
}

module.exports = { connectDB, connectDatabase, getDB };