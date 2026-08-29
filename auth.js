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
 * Si su correo está entre los 4 Super Admin, se le asigna 'superadmin'.
 * De lo contrario, se utiliza el rol seleccionado (cliente, vendedor o admin).
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
 * Traduce códigos de error comunes de Firebase Auth a mensajes amigables en español
 */
function parseAuthError(error) {
  if (error.code === "auth/unauthorized-domain") {
    const currentDomain = window.location.hostname || "tu dominio local";
    return `El dominio '${currentDomain}' no está autorizado en tu consola de Firebase. Agrega '${currentDomain}' en Firebase Console -> Authentication -> Settings -> Authorized domains.`;
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "La ventana de inicio de sesión con Google fue cerrada antes de completar.";
  }
  if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
    return "Correo o contraseña incorrectos.";
  }
  if (error.code === "auth/email-already-in-use") {
    return "Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.";
  }
  return error.message || "Ocurrió un error inesperado al autenticar.";
}

/**
 * Registra un nuevo usuario con Email y Contraseña
 */
export async function registerUser(email, password, firstName, lastName, selectedRole = "cliente") {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const finalRole = determineRole(email, selectedRole);

    // Guardar datos en Firestore document 'users/{uid}'
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      role: finalRole,
      createdAt: serverTimestamp()
    });

    return { success: true, user, role: finalRole };
  } catch (error) {
    console.error("Error en registro:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Inicia sesión con Email y Contraseña
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Obtener información y rol de Firestore
    let userDocRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userDocRef);

    let role = "cliente";
    if (userSnap.exists()) {
      role = userSnap.data().role || "cliente";
      // Si su correo es Super Admin y en base de datos no tiene ese rol, actualizarlo
      if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()) && role !== "superadmin") {
        role = "superadmin";
        await setDoc(userDocRef, { role: "superadmin" }, { merge: true });
      }
    } else {
      // Si por alguna razón no existía el documento en Firestore
      role = determineRole(user.email, "cliente");
      const nameParts = (user.displayName || "").split(" ");
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        firstName: nameParts[0] || "Usuario",
        lastName: nameParts.slice(1).join(" ") || "",
        role: role,
        createdAt: serverTimestamp()
      });
    }

    return { success: true, user, role };
  } catch (error) {
    console.error("Error en inicio de sesión:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
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

    let userDocRef = doc(db, "users", user.uid);
    let userSnap = await getDoc(userDocRef);

    let role = "cliente";

    if (!userSnap.exists()) {
      role = determineRole(user.email, selectedRole);
      const nameParts = (user.displayName || "").split(" ");
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        firstName: nameParts[0] || "Usuario",
        lastName: nameParts.slice(1).join(" ") || "",
        role: role,
        createdAt: serverTimestamp()
      });
    } else {
      role = userSnap.data().role || "cliente";
      if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()) && role !== "superadmin") {
        role = "superadmin";
        await setDoc(userDocRef, { role: "superadmin" }, { merge: true });
      }
    }

    return { success: true, user, role };
  } catch (error) {
    console.error("Error al iniciar con Google:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Cierra la sesión activa
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

/**
 * Escucha cambios en el estado de autenticación
 */
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      let userData = userSnap.exists() ? userSnap.data() : { email: user.email, role: "cliente" };
      callback(user, userData);
    } else {
      callback(null, null);
    }
  });
}
