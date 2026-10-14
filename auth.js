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
  const requestedName = requestedUsername.trim();
  const username = requestedName ? requestedName.replace(/^@?/, "@") : buildUsername(firstName, email);
  if (!firstName.trim() || firstName.length > 80 || lastName.length > 120
    || !/^@[a-zA-Z0-9_]{1,39}$/.test(username)) {
    return { success: false, message: "Revisa que el nombre y usuario tengan una longitud válida." };
  }
  let user;
  let profileWriteFailed = false;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;

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
    } catch (error) {
      profileWriteFailed = true;
      throw error;
    }

    return { success: true, user, role: finalRole };
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    if (user) {
      try {
        await deleteUser(user);
      } catch (rollbackError) {
        console.error("No se pudo revertir el alta incompleta en Firebase Auth:", rollbackError);
        return {
          success: false,
          message: profileWriteFailed
            ? `No se pudo guardar el perfil en Firestore y no se pudo eliminar la cuenta incompleta (${error.code || "error desconocido"}). Contacta a soporte antes de volver a registrarte.`
            : "No se pudo completar el registro y la cuenta quedó pendiente de revisión. Contacta a soporte antes de volver a registrarte."
        };
      }
    }
    if (profileWriteFailed) {
      return {
        success: false,
        message: parseAuthError(error)
      };
    }
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
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      throw new Error(PROFILE_REQUIRED_MESSAGE);
    }
    const role = determineRole(email, userSnap.data().role);

    return { success: true, user, role };
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    if (user) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("No se pudo cerrar la sesión tras fallar la carga del perfil:", signOutError);
      }
    }
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

    // Firestore is required for the profile and role used by the application.
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
        userData = {
          ...userData,
          firstName: firestoreData.firstName || userData.firstName,
          lastName: firestoreData.lastName || userData.lastName,
          username: firestoreData.username || userData.username,
          photoURL: firestoreData.photoURL || userData.photoURL,
          role: determineRole(firebaseUser.email, firestoreData.role)
        };
      } else {
        throw new Error("El perfil del usuario no existe en Firestore.");
      }
    } catch (error) {
      console.error("No se pudo verificar el perfil en Firestore:", error);
      onProfileError(error);
      return;
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

    callback(firebaseUser, userData);
  });
}
