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
  updateProfile,
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "./firebase-confi.js";

// Limpiar cualquier residuo de sesiones demo/temporales anteriores
try {
  sessionStorage.removeItem("paynex_temp_user");
  localStorage.removeItem("paynex_temp_user");
} catch (e) {}

/**
 * Determina el rol final del usuario.
 * Si su correo está entre los Super Admin, se le asigna 'superadmin'.
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
 * Traduce códigos de error de Firebase Auth a mensajes claros en español
 */
export function parseAuthError(error) {
  if (!error) return "Ocurrió un error inesperado.";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo electrónico o contraseña incorrectos.";
    case "auth/user-not-found":
      return "No existe ninguna cuenta registrada con este correo electrónico.";
    case "auth/email-already-in-use":
      return "Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.";
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Por seguridad, inténtalo de nuevo más tarde.";
    case "auth/network-request-failed":
      return "Error de conexión. Verifica tu conexión a internet.";
    case "auth/popup-closed-by-user":
      return "La ventana de inicio de sesión con Google fue cerrada antes de completar el proceso.";
    case "auth/unauthorized-domain": {
      const currentDomain = window.location.hostname || "tu dominio";
      return `El dominio '${currentDomain}' no está autorizado en Firebase Console. Agrégalo en Authentication -> Settings -> Authorized domains.`;
    }
    default:
      return error.message || "Error al procesar la autenticación con Firebase.";
  }
}

/**
 * Registra un usuario real con Email y Contraseña en Firebase Auth y Firestore
 */
export async function registerUser(email, password, firstName, lastName, selectedRole = "cliente") {
  const finalRole = determineRole(email, selectedRole);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const fullName = `${firstName} ${lastName}`.trim();

    // Actualizar nombre en el perfil de Firebase Auth
    try {
      await updateProfile(user, { displayName: fullName });
    } catch (profError) {
      console.warn("No se pudo actualizar displayName en Auth:", profError);
    }

    // Guardar documento del usuario en Firestore (colección 'users')
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        displayName: fullName,
        role: finalRole,
        createdAt: serverTimestamp()
      });
    } catch (fsError) {
      console.warn("Advertencia: Firestore no disponible al registrar usuario:", fsError);
    }

    return { success: true, user, role: finalRole };
  } catch (error) {
    console.error("Error al registrar usuario en Firebase Auth:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Inicia sesión de un usuario real con Email y Contraseña en Firebase Auth
 */
export async function loginUser(email, password) {
  const roleCalculated = determineRole(email, "cliente");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let role = roleCalculated;
    let userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      role: role
    };

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const firestoreData = userSnap.data();
        role = firestoreData.role || roleCalculated;
        userData = { ...userData, ...firestoreData, role };

        // Si es Super Admin, asegurar que su rol quede actualizado
        if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()) && role !== "superadmin") {
          role = "superadmin";
          userData.role = "superadmin";
          await setDoc(userDocRef, { role: "superadmin" }, { merge: true });
        }
      } else {
        // Si no existía documento en Firestore, crearlo con datos reales
        const nameParts = (user.displayName || "").split(" ");
        const firstName = nameParts[0] || user.email.split("@")[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        userData = {
          uid: user.uid,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          displayName: user.displayName || firstName,
          role: role,
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
      }
    } catch (fsError) {
      console.warn("Advertencia: Firestore inaccesible al iniciar sesión:", fsError);
    }

    return { success: true, user, userData, role };
  } catch (error) {
    console.error("Error al iniciar sesión en Firebase Auth:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Inicia sesión o registra un usuario real mediante Google Popup
 */
export async function loginWithGoogle(selectedRole = "cliente") {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    let role = determineRole(user.email, selectedRole);
    let userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      photoURL: user.photoURL || null,
      role: role
    };

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const firestoreData = userSnap.data();
        role = firestoreData.role || role;
        userData = { ...userData, ...firestoreData, role };
      } else {
        const nameParts = (user.displayName || "").split(" ");
        userData = {
          uid: user.uid,
          email: user.email,
          firstName: nameParts[0] || "Usuario",
          lastName: nameParts.slice(1).join(" ") || "",
          displayName: user.displayName || "Usuario",
          photoURL: user.photoURL || null,
          role: role,
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
      }
    } catch (fsError) {
      console.warn("Advertencia: Firestore inaccesible durante Google Login:", fsError);
    }

    return { success: true, user, userData, role };
  } catch (error) {
    console.error("Error al autenticar con Google:", error);
    return { success: false, message: parseAuthError(error), code: error.code };
  }
}

/**
 * Cierra la sesión activa en Firebase Auth
 */
export async function logoutUser() {
  try {
    sessionStorage.removeItem("paynex_temp_user");
    localStorage.removeItem("paynex_temp_user");
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión en Firebase:", error);
  }
  window.location.href = "login.html";
}

/**
 * Escucha en tiempo real el estado de autenticación de usuarios reales en Firebase
 */
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const nameParts = (user.displayName || "").split(" ");
      let userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        firstName: nameParts[0] || user.email.split("@")[0],
        lastName: nameParts.slice(1).join(" ") || "",
        photoURL: user.photoURL || null,
        role: determineRole(user.email, "cliente")
      };

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          userData = { ...userData, ...userSnap.data() };
        }
      } catch (fsError) {
        console.warn("Advertencia: Error leyendo Firestore en checkAuthState:", fsError);
      }

      callback(user, userData);
    } else {
      callback(null, null);
    }
  });
}
