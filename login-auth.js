import {
  checkAuthState,
  loginUser,
  loginWithGoogle,
  REGISTRATION_ENABLED,
  registerUser,
  resetPassword
} from "./auth.js";

const loginCard = document.getElementById("loginCard");
const registerCard = document.getElementById("registerCard");
const alertLogin = document.getElementById("alertLogin");
const alertRegister = document.getElementById("alertRegister");

function showAlert(box, message, type = "error") {
  box.className = `alert-box alert-${type}`;
  box.textContent = message;
}

function clearAlerts() {
  [alertLogin, alertRegister].forEach(box => {
    box.className = "alert-box";
    box.textContent = "";
  });
}

function showRegister() {
  loginCard.style.display = "none";
  registerCard.style.display = "flex";
  clearAlerts();
}

function showLogin() {
  registerCard.style.display = "none";
  loginCard.style.display = "flex";
  clearAlerts();
}

document.getElementById("linkToRegister").addEventListener("click", event => {
  event.preventDefault();
  showRegister();
});

document.getElementById("linkToLogin").addEventListener("click", event => {
  event.preventDefault();
  showLogin();
});

if (window.location.hash === "#register") showRegister();

document.querySelectorAll(".toggle-password").forEach(button => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "👁️" : "🔒";
    button.setAttribute("aria-label", input.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña");
  });
});

checkAuthState(
  user => {
    if (user) window.location.replace("dashboard.html");
  },
  error => {
    console.error("No se pudo verificar el perfil al cargar el inicio de sesión:", error);
    showAlert(
      alertLogin,
      "No se pudo comprobar tu perfil. Verifica tu conexión o contacta a soporte si el problema continúa.",
      "error"
    );
  }
);

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  clearAlerts();
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const result = await loginUser(
      document.getElementById("loginEmail").value.trim(),
      document.getElementById("loginPassword").value,
      document.getElementById("rememberMe").checked
    );
    if (result.success) {
      showAlert(alertLogin, "Inicio de sesión exitoso. Redirigiendo...", "success");
      window.location.replace("dashboard.html");
      return;
    }
    showAlert(alertLogin, result.message, "error");
  } catch (error) {
    console.error("Error inesperado al iniciar sesión:", error);
    showAlert(alertLogin, "No fue posible iniciar sesión. Inténtalo de nuevo más tarde.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("registerForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!REGISTRATION_ENABLED) {
    showAlert(alertRegister, "El registro no está disponible temporalmente.", "error");
    return;
  }
  clearAlerts();
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const password = document.getElementById("regPassword").value;
    if (password !== document.getElementById("regConfirmPassword").value) {
      showAlert(alertRegister, "Las contraseñas no coinciden.", "error");
      return;
    }
    const fullName = document.getElementById("regFullName").value.trim();
    const nameParts = fullName.split(/\s+/);
    const result = await registerUser(
      document.getElementById("regEmail").value.trim(),
      password,
      nameParts[0] || "",
      nameParts.slice(1).join(" "),
      document.getElementById("regRole").value,
      document.getElementById("regUsername").value.trim()
    );
    if (result.success) {
      showAlert(alertRegister, "Cuenta registrada correctamente. Redirigiendo...", "success");
      window.location.replace("dashboard.html");
      return;
    }
    showAlert(alertRegister, result.message, "error");
  } catch (error) {
    console.error("Error inesperado al registrar la cuenta:", error);
    showAlert(alertRegister, "No fue posible crear la cuenta. Inténtalo de nuevo más tarde.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

async function handleGoogleAuth(isRegister) {
  clearAlerts();
  const box = isRegister ? alertRegister : alertLogin;
  if (isRegister && !REGISTRATION_ENABLED) {
    showAlert(box, "El registro no está disponible temporalmente.", "error");
    return;
  }
  const button = document.getElementById(isRegister ? "btnGoogleRegister" : "btnGoogleLogin");
  button.disabled = true;
  try {
    const rememberMe = document.getElementById("rememberMe").checked;
    const result = await loginWithGoogle(rememberMe, isRegister);
    if (result.success) {
      window.location.replace("dashboard.html");
      return;
    }
    showAlert(box, result.message, "error");
  } finally {
    button.disabled = false;
  }
}

document.getElementById("btnGoogleLogin").addEventListener("click", () => handleGoogleAuth(false));
document.getElementById("btnGoogleRegister").addEventListener("click", () => handleGoogleAuth(true));

document.getElementById("forgotPasswordLink").addEventListener("click", async event => {
  event.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const email = emailInput.value.trim();
  if (!email) {
    showAlert(alertLogin, "Escribe tu correo para enviarte el enlace de recuperación.", "error");
    emailInput.focus();
    return;
  }
  try {
    await resetPassword(email);
    showAlert(alertLogin, "Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.", "success");
  } catch (error) {
    console.error("Error al solicitar restablecimiento de contraseña:", error);
    showAlert(alertLogin, "No fue posible enviar el correo. Revisa la dirección e inténtalo de nuevo.", "error");
  }
});
