// Marcador de puntuaciones compartido.
// Si firebase-config.js tiene una configuración real, usa Firestore (todos los amigos ven el mismo ranking).
// Si no, cae a un marcador SOLO LOCAL en localStorage (modo offline / desarrollo).

const Leaderboard = (function () {
  let db = null;
  let usingFirebase = false;

  try {
    if (window.BENI_FIREBASE_CONFIG && window.BENI_FIREBASE_CONFIG.apiKey && window.firebase) {
      firebase.initializeApp(window.BENI_FIREBASE_CONFIG);
      db = firebase.firestore();
      usingFirebase = true;
    }
  } catch (err) {
    console.warn('Firebase no disponible, usando marcador local.', err);
  }

  const LOCAL_KEY = 'beni_leaderboard_local';

  function localGetAll() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch (e) { return []; }
  }

  function localSave(rows) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  }

  function submitScore(name, carlitos, distance, skinId) {
    if (usingFirebase) {
      return db.collection('scores').add({
        name: name,
        carlitos: carlitos,
        distance: distance,
        skin: skinId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(err => {
        console.warn('Error al guardar en Firestore, usando local.', err);
        return submitScoreLocal(name, carlitos, distance, skinId);
      });
    }
    return submitScoreLocal(name, carlitos, distance, skinId);
  }

  function submitScoreLocal(name, carlitos, distance, skinId) {
    const rows = localGetAll();
    rows.push({ name, carlitos, distance, skin: skinId });
    localSave(rows);
    return Promise.resolve();
  }

  function getTop(limit) {
    if (usingFirebase) {
      return db.collection('scores')
        .orderBy('carlitos', 'desc')
        .limit(limit)
        .get()
        .then(snap => snap.docs.map(d => d.data()))
        .catch(err => {
          console.warn('Error al leer Firestore, usando local.', err);
          return getTopLocal(limit);
        });
    }
    return getTopLocal(limit);
  }

  function getTopLocal(limit) {
    const rows = localGetAll().sort((a, b) => (b.carlitos || 0) - (a.carlitos || 0)).slice(0, limit);
    return Promise.resolve(rows);
  }

  return { submitScore, getTop, isUsingFirebase: () => usingFirebase };
})();
