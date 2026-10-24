import { checkAuthState } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnLandingLogin = document.getElementById("btnLandingLogin");
  const btnLandingRegister = document.getElementById("btnLandingRegister");
  const loggedInChip = document.getElementById("loggedInChip");
  const landingUserAvatar = document.getElementById("landingUserAvatar");
  const landingUserName = document.getElementById("landingUserName");
  const searchForm = document.getElementById("landingSearchForm");

  // Elementos de navegación móvil
  const btnMobileNavToggle = document.getElementById("btnMobileNavToggle");
  const btnCloseMobileNav = document.getElementById("btnCloseMobileNav");
  const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");
  const mobileNavDrawer = document.getElementById("mobileNavDrawer");
  const mobileSearchForm = document.getElementById("mobileSearchForm");
  const btnMobileLogin = document.getElementById("btnMobileLogin");
  const btnMobileRegister = document.getElementById("btnMobileRegister");
  const mobileLoggedInChip = document.getElementById("mobileLoggedInChip");
  const mobileUserAvatar = document.getElementById("mobileUserAvatar");
  const mobileUserName = document.getElementById("mobileUserName");

  function openMobileNav() {
    mobileNavBackdrop?.classList.add("open");
    mobileNavDrawer?.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeMobileNav() {
    mobileNavBackdrop?.classList.remove("open");
    mobileNavDrawer?.classList.remove("open");
    document.body.style.overflow = "";
  }

  btnMobileNavToggle?.addEventListener("click", openMobileNav);
  btnCloseMobileNav?.addEventListener("click", closeMobileNav);
  mobileNavBackdrop?.addEventListener("click", closeMobileNav);

  // Cerrar menú móvil al hacer click en enlaces ancla
  document.querySelectorAll(".mobile-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  });

  searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    const query = document.getElementById("landingSearchInput").value.trim();
    window.location.href = `dashboard.html?search=${encodeURIComponent(query)}`;
  });

  mobileSearchForm?.addEventListener("submit", event => {
    event.preventDefault();
    const query = document.getElementById("mobileSearchInput").value.trim();
    closeMobileNav();
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
      if (btnMobileLogin) btnMobileLogin.style.display = "none";
      if (btnMobileRegister) btnMobileRegister.style.display = "none";
      
      if (loggedInChip) {
        loggedInChip.style.display = "flex";
        if (landingUserName) landingUserName.textContent = `Panel (${firstName})`;
        if (landingUserAvatar) landingUserAvatar.src = photo;
      }

      if (mobileLoggedInChip) {
        mobileLoggedInChip.style.display = "flex";
        if (mobileUserName) mobileUserName.textContent = `Panel (${firstName})`;
        if (mobileUserAvatar) mobileUserAvatar.src = photo;
      }
    } else {
      // Usuario no autenticado: mostrar opciones de acceso y estado del registro
      if (btnLandingLogin) btnLandingLogin.style.display = "inline-flex";
      if (btnLandingRegister) btnLandingRegister.style.display = "inline-flex";
      if (loggedInChip) loggedInChip.style.display = "none";

      if (btnMobileLogin) btnMobileLogin.style.display = "block";
      if (btnMobileRegister) btnMobileRegister.style.display = "block";
      if (mobileLoggedInChip) mobileLoggedInChip.style.display = "none";
    }
  }, error => {
    console.error("No se pudo verificar el perfil en la página de inicio:", error);
    window.location.replace("login.html?profileError=1");
  });
});
