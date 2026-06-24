// Configuración de Firebase (claves PÚBLICAS del proyecto, no secretas).
//
// Para activar el marcador de puntuaciones COMPARTIDO entre todos los amigos:
// 1. Ve a https://console.firebase.google.com → "Agregar proyecto" (gratis, plan Spark).
// 2. Dentro del proyecto: "Compilación" → "Firestore Database" → "Crear base de datos"
//    → modo "producción" → elige una región cercana (ej. europe-west).
// 3. En "Reglas" de Firestore, pega esto (permite leer/escribir solo la colección "scores",
//    pensado para un juego informal entre amigos, sin login):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /scores/{doc} {
//          allow read: if true;
//          allow create: if request.resource.data.distance is number
//                        && request.resource.data.distance >= 0
//                        && request.resource.data.distance < 100000
//                        && request.resource.data.name is string
//                        && request.resource.data.name.size() <= 20;
//          allow update, delete: if false;
//        }
//      }
//    }
//
// 4. En el proyecto: ⚙️ "Configuración del proyecto" → pestaña "General" → sección
//    "Tus apps" → "Agregar app" → icono web (</>) → copia el objeto `firebaseConfig`
//    y pégalo abajo, reemplazando el objeto de ejemplo.
//
// Si dejas esto sin rellenar, el juego sigue funcionando con un marcador SOLO LOCAL
// (cada móvil ve únicamente sus propias partidas).

window.BENI_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAu0cE4w20V1EDwoZjU-1UXXM3z-4EPIWk',
  authDomain: 'beni-juego.firebaseapp.com',
  projectId: 'beni-juego',
  storageBucket: 'beni-juego.firebasestorage.app',
  messagingSenderId: '251121437681',
  appId: '1:251121437681:web:8f42fa245d81377d25d250',
};
