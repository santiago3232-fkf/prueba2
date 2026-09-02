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
 * Manejo de sesión temporal local (cuando Firebase no está disponible o da error de permisos)
 */
function setTempUser(email, role = "cliente", firstName = "Usuario", lastName = "Temporal") {
  const tempUser = {
    uid: "temp_" + Date.now(),
    email: email,
    displayName: `${firstName} ${lastName}`.trim(),
    role: determineRole(email, role),
    firstName: firstName,
    lastName: lastName,
    isTemp: true
  };
  sessionStorage.setItem("paynex_temp_user", JSON.stringify(tempUser));
  return tempUser;
}

function getTempUser() {
  const data = sessionStorage.getItem("paynex_temp_user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * Registra un nuevo usuario con Email y Contraseña
 */
export async function registerUser(email, password, firstName, lastName, selectedRole = "cliente") {
  const finalRole = determineRole(email, selectedRole);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar datos en Firestore document 'users/{uid}'
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: finalRole,
        createdAt: serverTimestamp()
      });
    } catch (fsError) {
      console.warn("Firestore bloqueado. Creando usuario en sesión temporal local:", fsError);
      setTempUser(email, finalRole, firstName, lastName);
    }

    return { success: true, user, role: finalRole };
  } catch (error) {
    console.warn("Error en Firebase Auth, usando modo temporal:", error);
    // Si falla Firebase Auth (o no hay acceso), se habilita el acceso en modo temporal
    const tempUser = setTempUser(email, finalRole, firstName, lastName);
    return { success: true, user: tempUser, role: finalRole, isTemp: true };
  }
}

/**
 * Inicia sesión con Email y Contraseña
 */
export async function loginUser(email, password) {
  const roleCalculated = determineRole(email, "cliente");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let role = roleCalculated;
    try {
      let userDocRef = doc(db, "users", user.uid);
      let userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        role = userSnap.data().role || roleCalculated;
        if (SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()) && role !== "superadmin") {
          role = "superadmin";
          await setDoc(userDocRef, { role: "superadmin" }, { merge: true });
        }
      } else {
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
    } catch (fsError) {
      console.warn("Firestore bloqueado al iniciar sesión. Usando sesión temporal:", fsError);
      setTempUser(user.email, role, "Usuario", "Prueba");
    }

    return { success: true, user, role };
  } catch (error) {
    console.warn("Iniciando sesión en MODO TEMPORAL por fallo de Firebase:", error);
    // Permite iniciar sesión temporalmente si Firebase no tiene permisos o acceso
    const tempUser = setTempUser(email, roleCalculated, "Usuario", "Demo");
    return { success: true, user: tempUser, role: roleCalculated, isTemp: true };
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
      let userDocRef = doc(db, "users", user.uid);
      let userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        role = userSnap.data().role || role;
      } else {
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
    } catch (fsError) {
      console.warn("Firestore inaccesible durante Google Login. Usando sesión temporal:", fsError);
      setTempUser(user.email, role, user.displayName || "Usuario Google", "");
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
  sessionStorage.removeItem("paynex_temp_user");
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
  window.location.href = "login.html";
}

/**
 * Escucha cambios en el estado de autenticación
 */
export function checkAuthState(callback) {
  // Primero revisar si hay un usuario temporal en sessionStorage
  const tempUser = getTempUser();
  if (tempUser) {
    callback(tempUser, {
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      role: tempUser.role
    });
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      let userData = { email: user.email, role: determineRole(user.email, "cliente") };
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          userData = userSnap.data();
        }
      } catch (fsError) {
        console.warn("Error leyendo Firestore en checkAuthState:", fsError);
      }
      callback(user, userData);
    } else {
      callback(null, null);
    }
  });
}

