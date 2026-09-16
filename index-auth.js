import { checkAuthState, logoutUser } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnLandingLogin = document.getElementById("btnLandingLogin");
  const btnLandingRegister = document.getElementById("btnLandingRegister");
  const loggedInChip = document.getElementById("loggedInChip");
  const landingUserAvatar = document.getElementById("landingUserAvatar");
  const landingUserName = document.getElementById("landingUserName");

  // Comprobar estado de autenticación en la Landing Page
  checkAuthState((user, userData) => {
    if (user) {
      // Usuario autenticado: mostrar chip de acceso directo al Dashboard
      const firstName = userData?.firstName || (user.displayName ? user.displayName.split(" ")[0] : null) || user.email?.split("@")[0] || "Mi Panel";
      const photo = localStorage.getItem(`paynex_avatar_${user.email}`) || userData?.photoURL || user.photoURL || "img/register_panel.png";

      if (btnLandingLogin) btnLandingLogin.style.display = "none";
      if (btnLandingRegister) btnLandingRegister.style.display = "none";
      
      if (loggedInChip) {
        loggedInChip.style.display = "flex";
        if (landingUserName) landingUserName.textContent = `Panel (${firstName})`;
        if (landingUserAvatar) landingUserAvatar.src = photo;
      }
    } else {
      // Usuario no autenticado: mostrar botones de Iniciar sesión y Registrarse
      if (btnLandingLogin) btnLandingLogin.style.display = "inline-flex";
      if (btnLandingRegister) btnLandingRegister.style.display = "inline-flex";
      if (loggedInChip) loggedInChip.style.display = "none";
    }
  });
});
