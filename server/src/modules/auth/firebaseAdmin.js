const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let firebaseAuth;

function initializeFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required");
  }

  const existingApp = getApps().find((app) => app.name === "[DEFAULT]");
  const app =
    existingApp ||
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });

  if (app.options.projectId && app.options.projectId !== projectId) {
    throw new Error("Configured Firebase project does not match the initialized Admin app");
  }

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

function getFirebaseAuth() {
  if (!firebaseAuth) {
    throw new Error("Firebase Admin SDK has not been initialized");
  }

  return firebaseAuth;
}

module.exports = { getFirebaseAuth, initializeFirebaseAdmin };
