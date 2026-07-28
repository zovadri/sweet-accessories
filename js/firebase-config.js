const firebaseConfig = {
  apiId: "YOUR_API_ID",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const CACHE_DURATION = 5 * 60 * 1000;

function getCached(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

function setCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

async function getCollection(collectionName) {
  const cached = getCached(collectionName);
  if (cached) return cached;
  const snapshot = await db.collection(collectionName).get();
  const items = [];
  snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
  setCache(collectionName, items);
  return items;
}

async function getDocument(collection, docId) {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function addDocument(collection, data) {
  const docRef = await db.collection(collection).add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  localStorage.removeItem(collection);
  return docRef.id;
}

async function updateDocument(collection, docId, data) {
  await db.collection(collection).doc(docId).update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  localStorage.removeItem(collection);
}

async function deleteDocument(collection, docId) {
  await db.collection(collection).doc(docId).delete();
  localStorage.removeItem(collection);
}

async function uploadImage(file, path) {
  const ref = storage.ref(path);
  const snapshot = await ref.put(file);
  return await snapshot.ref.getDownloadURL();
}

async function deleteImage(url) {
  if (!url || url.includes('firebasestorage')) {
    try {
      const ref = storage.refFromURL(url);
      await ref.delete();
    } catch (e) { console.warn('Delete image error:', e); }
  }
}

async function login(email, password) {
  return await auth.signInWithEmailAndPassword(email, password);
}

async function logout() {
  await auth.signOut();
}

auth.onAuthStateChanged(user => {
  if (user) {
    localStorage.setItem('adminUser', JSON.stringify({ email: user.email, uid: user.uid }));
  } else {
    localStorage.removeItem('adminUser');
  }
});
