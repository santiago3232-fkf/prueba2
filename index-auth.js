import { checkAuthState } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnLandingLogin = document.getElementById("btnLandingLogin");
  const btnLandingRegister = document.getElementById("btnLandingRegister");
  const loggedInChip = document.getElementById("loggedInChip");
  const landingUserAvatar = document.getElementById("landingUserAvatar");
  const landingUserName = document.getElementById("landingUserName");
  const searchForm = document.getElementById("landingSearchForm");

  searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    const query = document.getElementById("landingSearchInput").value.trim();
    window.location.href = `dashboard.html?search=${encodeURIComponent(query)}`;
  });

  // Comprobar estado de autenticación en la Landing Page
  checkAuthState((user, userData) => {
    if (user) {
      if (user.email) {
        try {
          localStorage.removeItem(`paynex_avatar_${user.email}`);
        } catch (error) {
          console.warn("No se pudo limpiar el avatar local heredado:", error);
        }
      }
      // Usuario autenticado: mostrar chip de acceso directo al Dashboard
      const firstName = userData?.firstName || (user.displayName ? user.displayName.split(" ")[0] : null) || user.email?.split("@")[0] || "Mi Panel";
      const candidatePhoto = typeof userData?.photoURL === "string" ? userData.photoURL
        : typeof user.photoURL === "string" ? user.photoURL : "";
      const photo = candidatePhoto.startsWith("https://") || /^img\/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|gif|svg)$/.test(candidatePhoto)
        ? candidatePhoto
        : "img/register_panel.png";

      if (btnLandingLogin) btnLandingLogin.style.display = "none";
      if (btnLandingRegister) btnLandingRegister.style.display = "none";
      
      if (loggedInChip) {
        loggedInChip.style.display = "flex";
        if (landingUserName) landingUserName.textContent = `Panel (${firstName})`;
        if (landingUserAvatar) landingUserAvatar.src = photo;
      }
    } else {
      // Usuario no autenticado: mostrar opciones de acceso y estado del registro
      if (btnLandingLogin) btnLandingLogin.style.display = "inline-flex";
      if (btnLandingRegister) btnLandingRegister.style.display = "inline-flex";
      if (loggedInChip) loggedInChip.style.display = "none";
    }
  }, error => {
    console.error("No se pudo verificar el perfil en la página de inicio:", error);
    window.location.replace("login.html?profileError=1");
  });
});
