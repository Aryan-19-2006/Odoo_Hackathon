function initializeFirebaseAdmin() {
  console.log("DUMMY Firebase mode - bypassed");
  return {
    auth: () => ({
      verifyIdToken: async () => ({ uid: 'dev-user' })
    })
  };
}
function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}
module.exports = { initializeFirebaseAdmin, getFirebaseAdmin };