const admin = require('firebase-admin');
const serviceAccount = require('./../serviceAccountKey.json'); // Downloaded from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://taza-1b0ed.appspot.com' // Replace with your Firebase project ID
});

const bucket = admin.storage().bucket();

module.exports = { bucket };