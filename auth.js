import { 
  auth, 
  db, 
  SUPER_ADMIN_EMAILS,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "./firebase-confi.js";

/**
 * Determina el rol final del usuario.
 * Si su correo está entre los Super Admin, se le asigna 'superadmin'.
 */
export function determineRole(email, selectedRole = "cliente") {
  if (!email) return selectedRole;
  const cleanEmail = email.toLowerCase().trim();
  if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(cleanEmail)) {
    return "superadmin";
  }
  return selectedRole;
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes en español
 */
function parseAuthError(error) {
  if (error.code === "auth/unauthorized-domain") {
    const d = window.location.hostname || "tu dominio local";
    return `El dominio '${d}' no está autorizado en Firebase. Agrégalo en Firebase Console → Authentication → Authorized domains.`;
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "La ventana de Google fue cerrada antes de completar.";
  }
  if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
    return "Correo o contraseña incorrectos.";
  }
  if (error.code === "auth/email-already-in-use") {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }
  return error.message || "Ocurrió un error inesperado.";
}

/**
 * Genera un @username a partir del nombre o email
 */
function buildUsername(firstName, email) {
  const base = (firstName || email?.split("@")[0] || "usuario")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
  return `@${base}`;
}

/**
 * Registra un nuevo usuario con Email y Contraseña
 */
export async function registerUser(email, password, firstName, lastName, selectedRole = "cliente") {
  const finalRole = determineRole(email, selectedRole);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const username = buildUsername(firstName, email);

    const userData = {
      uid: user.uid,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      username: username,
      role: finalRole,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "users", user.uid), userData);
    } catch (fsError) {
      console.warn("Firestore bloqueado al registrar:", fsError);
    }

    return { success: true, user, role: finalRole };
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return { success: false, message: parseAuthError(error) };
  }
}

/**
 * Inicia sesión con Email y Contraseña
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let role = determineRole(email, "cliente");
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        role = data.role || role;
        // Actualizar rol a superadmin si aplica
        if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase()) && role !== "superadmin") {
          role = "superadmin";
          await setDoc(userDocRef, { role: "superadmin" }, { merge: true });
        }
      } else {
        // Usuario existe en Auth pero no en Firestore — crearlo
        const nameParts = (user.displayName || "").split(" ");
        const firstName = nameParts[0] || email.split("@")[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          firstName,
          lastName,
          username: buildUsername(firstName, email),
          role,
          createdAt: serverTimestamp()
        });
      }
    } catch (fsError) {
      console.warn("Firestore no disponible al iniciar sesión:", fsError);
    }

    return { success: true, user, role };
  } catch (error) {
    return { success: false, message: parseAuthError(error) };
  }
}

/**
 * Inicia sesión / Registro mediante Google
 */
export async function loginWithGoogle(selectedRole = "cliente") {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    let role = determineRole(user.email, selectedRole);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        role = userSnap.data().role || role;
      } else {
        const nameParts = (user.displayName || "").split(" ");
        const firstName = nameParts[0] || user.email.split("@")[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          firstName,
          lastName,
          username: buildUsername(firstName, user.email),
          role,
          createdAt: serverTimestamp()
        });
      }
    } catch (fsError) {
      console.warn("Firestore inaccesible en Google Login:", fsError);
    }

    return { success: true, user, role };
  } catch (error) {
    console.error("Error al iniciar con Google:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Cierra la sesión activa.
 * Limpia TODO el estado local para evitar que el usuario vuelva atrás y acceda.
 */
export async function logoutUser() {
  // Limpiar todo el estado de sesión local/temporal
  sessionStorage.clear();
  localStorage.removeItem("paynex_temp_user");

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
  // Reemplazar el historial para que el botón "atrás" no regrese al dashboard
  window.location.replace("login.html");
}

/**
 * Escucha cambios en el estado de autenticación.
 * SIEMPRE usa Firebase onAuthStateChanged como fuente de verdad.
 * El sessionStorage solo se usa como caché de datos adicionales del perfil.
 */
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      // Sin sesión real en Firebase → limpiar caché y denegar acceso
      sessionStorage.removeItem("paynex_temp_user");
      callback(null, null);
      return;
    }

    // Hay sesión real en Firebase → cargar datos de Firestore
    let userData = {
      firstName: "",
      lastName: "",
      username: "",
      email: firebaseUser.email,
      role: determineRole(firebaseUser.email, "cliente"),
      photoURL: firebaseUser.photoURL || ""
    };

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const firestoreData = userSnap.data();
        // Firestore es la fuente de verdad para nombre, rol y username
        userData = {
          ...userData,
          ...firestoreData
        };
      }
    } catch (fsError) {
      console.warn("No se pudo leer Firestore en checkAuthState:", fsError);
      // Intentar recuperar del caché de sesión como fallback
      try {
        const cached = JSON.parse(sessionStorage.getItem("paynex_temp_user") || "null");
        if (cached && cached.email === firebaseUser.email) {
          userData = { ...userData, ...cached };
        }
      } catch (_) {}
    }

    // Si firstName sigue vacío, usar displayName de Google o parte del email
    if (!userData.firstName) {
      const nameParts = (firebaseUser.displayName || "").split(" ");
      userData.firstName = nameParts[0] || firebaseUser.email.split("@")[0];
      userData.lastName = nameParts.slice(1).join(" ") || "";
    }

    // Garantizar que username siempre tenga valor
    if (!userData.username) {
      userData.username = buildUsername(userData.firstName, firebaseUser.email);
    }

    // Guardar en caché de sesión para recuperación offline
    sessionStorage.setItem("paynex_temp_user", JSON.stringify({
      ...userData,
      uid: firebaseUser.uid,
      email: firebaseUser.email
    }));

    callback(firebaseUser, userData);
  });
}
