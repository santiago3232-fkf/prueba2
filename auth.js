import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  deleteUser,
  sendPasswordResetEmail,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "./firebase-confi.js";

export const REGISTRATION_ENABLED = true;
const PROFILE_REQUIRED_MESSAGE = "No encontramos un perfil PayNex asociado a esta cuenta. Si el problema continúa, contacta a soporte.";

export function determineRole(email, selectedRole = "cliente") {
  return selectedRole === "vendedor" ? "vendedor" : "cliente";
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes en español
 */
function parseAuthError(error) {
  if (error.message === PROFILE_REQUIRED_MESSAGE) {
    return PROFILE_REQUIRED_MESSAGE;
  }
  if (error.code === "auth/unauthorized-domain") {
    const d = window.location.hostname || "tu dominio local";
    return `El dominio '${d}' no está autorizado en Firebase. Agrégalo en Firebase Console → Authentication → Authorized domains.`;
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "La ventana de Google fue cerrada antes de completar.";
  }
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)) {
    return "Correo o contraseña incorrectos.";
  }
  if (error.code === "auth/email-already-in-use") {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }
  if (error.code === "auth/too-many-requests") {
    return "Se realizaron demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }
  if (error.code === "auth/network-request-failed") {
    return "No fue posible conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.";
  }
  if (error.code === "auth/operation-not-allowed") {
    return "Este método de acceso no está habilitado en Firebase.";
  }
  if (error.code === "auth/weak-password") {
    return "La contraseña es demasiado débil. Usa al menos 6 caracteres y vuelve a intentarlo.";
  }
  if (error.code === "auth/invalid-email") {
    return "El correo electrónico no tiene un formato válido.";
  }
  if (error.code === "auth/invalid-api-key" || error.code === "auth/app-not-authorized") {
    return "La configuración de Firebase no autoriza esta aplicación. Contacta a soporte.";
  }
  if (error.code === "permission-denied") {
    return "Firebase Authentication recibió el registro, pero Firestore rechazó el perfil. Publica las reglas actuales de firestore.rules en Firebase Console y vuelve a intentarlo.";
  }
  if (error.code === "unavailable" || error.code === "deadline-exceeded") {
    return "No se pudo conectar con Firestore para guardar el perfil. Revisa tu conexión e inténtalo de nuevo.";
  }
  if (error.code) {
    return `Firebase rechazó el registro (${error.code}). Revisa la configuración del proyecto e inténtalo de nuevo.`;
  }
  return "No se pudo completar la autenticación. Verifica los datos e inténtalo de nuevo.";
}

/**
 * Genera un @username a partir del nombre o email
 */
function buildUsername(firstName, email) {
  const base = (firstName || email?.split("@")[0] || "usuario")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 39);
  return `@${base || "usuario"}`;
}

/**
 * Registra un nuevo usuario con Email y Contraseña
 */
export async function registerUser(email, password, firstName, lastName, selectedRole = "cliente", requestedUsername = "") {
  if (!REGISTRATION_ENABLED) {
    return {
      success: false,
      message: "El registro no está disponible temporalmente."
    };
  }
  const finalRole = determineRole(email, selectedRole);
  const cleanUserPart = (requestedUsername || firstName || email.split("@")[0])
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 38);
  const username = `@${cleanUserPart || "usuario"}`;
  
  const cleanFirstName = (firstName || "Usuario").trim().slice(0, 80);
  const cleanLastName = (lastName || "").trim().slice(0, 120);

  let user;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;

    const baseUserData = {
      uid: user.uid,
      email: user.email,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      username: username,
      role: finalRole,
      createdAt: serverTimestamp()
    };

    const fullUserData = {
      ...baseUserData,
      termsAccepted: true,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: "2.4-2026"
    };

    // Intentar primero con todos los campos (para reglas actualizadas)
    try {
      await setDoc(doc(db, "users", user.uid), fullUserData);
    } catch (writeErr) {
      console.warn("Firestore rechazó campos extendidos de perfil, intentando campos base:", writeErr);
      try {
        await setDoc(doc(db, "users", user.uid), baseUserData);
      } catch (fallbackErr) {
        console.warn("Firestore no permitió guardar en la nube, usando modo contingencia local:", fallbackErr);
      }
    }

    // Persistir perfil local de contingencia
    try {
      localStorage.setItem(`paynex_profile_${user.uid}`, JSON.stringify({
        ...fullUserData,
        createdAt: new Date().toISOString()
      }));
    } catch (storageErr) {
      console.warn("No se pudo guardar en almacenamiento local:", storageErr);
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
export async function loginUser(email, password, rememberMe = false) {
  let user;
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    user = userCredential.user;

    const userDocRef = doc(db, "users", user.uid);
    let role = determineRole(email, "cliente");

    try {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        role = determineRole(email, userSnap.data().role);
      } else {
        console.warn("Usuario autenticado sin documento en Firestore, auto-creando perfil...");
        const firstName = user.displayName?.split(" ")[0] || email.split("@")[0] || "Usuario";
        const lastName = user.displayName?.split(" ").slice(1).join(" ") || "";
        const autoProfile = {
          uid: user.uid,
          email: user.email,
          firstName: firstName.slice(0, 80),
          lastName: lastName.slice(0, 120),
          username: buildUsername(firstName, email),
          role,
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, autoProfile).catch(e => console.warn("No se pudo escribir auto-perfil:", e));
        localStorage.setItem(`paynex_profile_${user.uid}`, JSON.stringify(autoProfile));
      }
    } catch (docErr) {
      console.warn("Error leyendo documento en loginUser, usando perfil contingencia:", docErr);
      const savedProfile = localStorage.getItem(`paynex_profile_${user.uid}`);
      if (savedProfile) {
        try { role = JSON.parse(savedProfile).role || role; } catch (e) {}
      }
    }

    return { success: true, user, role };
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { success: false, message: parseAuthError(error) };
  }
}

/**
 * Inicia sesión con Google para perfiles que ya existen en Firestore.
 */
export async function loginWithGoogle(rememberMe = false, allowRegistration = false) {
  let user;
  let isNewUser = false;
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    user = result.user;
    isNewUser = getAdditionalUserInfo(result)?.isNewUser === true;

    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      if (!allowRegistration || !REGISTRATION_ENABLED || !isNewUser || !user.email) {
        throw new Error(PROFILE_REQUIRED_MESSAGE);
      }
      const nameParts = (user.displayName || "").trim().split(/\s+/);
      const firstName = (nameParts[0] || user.email.split("@")[0]).slice(0, 80);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName: nameParts.slice(1).join(" ").slice(0, 120),
        username: buildUsername(firstName, user.email),
        role: "cliente",
        createdAt: serverTimestamp()
      });
    }
    const role = determineRole(user.email, userSnap.data().role);

    return { success: true, user, role };
  } catch (error) {
    console.error("Error al iniciar con Google:", error);
    if (user) {
      if (isNewUser) {
        try {
          await deleteUser(user);
          user = null;
        } catch (rollbackError) {
          console.error("No se pudo eliminar la cuenta de Google creada sin perfil:", rollbackError);
        }
      }
    }
    if (user) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("No se pudo cerrar la sesión tras fallar el perfil de Google:", signOutError);
      }
    }
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Cierra la sesión activa.
 * Cierra la sesión mantenida por Firebase Authentication.
 */
export async function logoutUser() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Escucha cambios en el estado de autenticación.
 * SIEMPRE usa Firebase onAuthStateChanged como fuente de verdad.
 */
export function checkAuthState(callback, onProfileError) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      sessionStorage.removeItem("paynex_temp_user");
    } catch (error) {
      console.warn("No se pudo limpiar el perfil temporal heredado:", error);
    }
    if (!firebaseUser) {
      callback(null, null);
      return;
    }

    const nameParts = (firebaseUser.displayName || "").trim().split(/\s+/);
    const fallbackFirstName = nameParts[0] || firebaseUser.email?.split("@")[0] || "Usuario";
    const fallbackLastName = nameParts.slice(1).join(" ") || "";

    let userData = {
      uid: firebaseUser.uid,
      firstName: fallbackFirstName,
      lastName: fallbackLastName,
      username: buildUsername(fallbackFirstName, firebaseUser.email),
      email: firebaseUser.email,
      role: determineRole(firebaseUser.email, "cliente"),
      photoURL: firebaseUser.photoURL || ""
    };

    // Intentar leer caché local previa
    try {
      const cached = localStorage.getItem(`paynex_profile_${firebaseUser.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        userData = { ...userData, ...parsed };
      }
    } catch (e) {}

    // Sincronizar con Firestore
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const firestoreData = userSnap.data();
        userData = {
          ...userData,
          firstName: firestoreData.firstName || userData.firstName,
          lastName: firestoreData.lastName || userData.lastName,
          username: firestoreData.username || userData.username,
          photoURL: firestoreData.photoURL || userData.photoURL,
          role: determineRole(firebaseUser.email, firestoreData.role)
        };
        // Actualizar caché local
        localStorage.setItem(`paynex_profile_${firebaseUser.uid}`, JSON.stringify(userData));
      } else {
        // Documento no existe en Firestore, intentar auto-crearlo
        console.warn("Perfil ausente en Firestore, auto-creando perfil inicial...");
        setDoc(userDocRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          role: userData.role,
          createdAt: serverTimestamp()
        }).catch(err => console.warn("No se pudo auto-crear perfil en Firestore:", err));
      }
    } catch (error) {
      console.warn("Lectura de Firestore no disponible o denegada, continuando con perfil seguro:", error);
    }

    // Garantizar que username siempre tenga valor válido
    if (!userData.username) {
      userData.username = buildUsername(userData.firstName, firebaseUser.email);
    }

    callback(firebaseUser, userData);
  });
}
