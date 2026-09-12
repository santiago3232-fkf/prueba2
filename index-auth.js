import { checkAuthState, logoutUser } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("mainSidebar");
  const btnLogout = document.getElementById("btnLogoutSidebar");
  const btnLogin = document.getElementById("btnLoginSidebar");
  const userInfo = document.getElementById("sidebarUserInfo");
  const userAvatar = document.getElementById("sidebarUserAvatar");
  const userName = document.getElementById("sidebarUserName");
  const userRole = document.getElementById("sidebarUserRole");
  const navLoginLink = document.getElementById("navLoginLink");
  const toggleButtons = document.querySelectorAll(".toggle-sidebar-action");
  const backdrop = document.getElementById("sidebarBackdrop");

  // Función para alternar el menú lateral
  const toggleSidebar = (forceState) => {
    const shouldOpen = typeof forceState === "boolean" 
      ? forceState 
      : !document.body.classList.contains("sidebar-open");
    
    if (shouldOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }

    const navBtnText = document.querySelector("#btnToggleSidebar span");
    if (navBtnText) {
      navBtnText.textContent = shouldOpen ? "Ocultar Menú" : "Menú PayNex";
    }
  };

  // Asociar botones para abrir/cerrar sidebar
  toggleButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleSidebar();
    });
  });

  // Cerrar al hacer clic en el backdrop en móviles
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      toggleSidebar(false);
    });
  }

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });
  }

  // Comprobar estado de autenticación
  checkAuthState((user, userData) => {
    if (user) {
      // USUARIO LOGUEADO:
      // Se abre automáticamente el menú lateral en index.html
      document.body.classList.add("sidebar-open");
      document.body.classList.add("is-logged-in");

      const navBtnText = document.querySelector("#btnToggleSidebar span");
      if (navBtnText) navBtnText.textContent = "Ocultar Menú";

      const nameParts = (user.displayName || "").split(" ");
      const firstName = userData?.firstName || user.firstName || nameParts[0] || (user.email ? user.email.split("@")[0] : "Usuario");
      const lastName = userData?.lastName || user.lastName || nameParts.slice(1).join(" ") || "";
      const fullName = (userData?.firstName || user.firstName) 
        ? `${firstName} ${lastName}`.trim() 
        : (user.displayName || user.email);
      const role = (userData?.role || user.role || "cliente").toUpperCase();
      const photo = user.photoURL || "img/register_panel.png";

      if (userName) userName.textContent = fullName;
      if (userRole) userRole.textContent = role;
      if (userAvatar) userAvatar.src = photo;
      if (userInfo) userInfo.style.display = "flex";

      if (btnLogin) btnLogin.style.display = "none";
      if (btnLogout) btnLogout.style.display = "flex";

      if (navLoginLink) {
        navLoginLink.innerHTML = `📊 Panel Dashboard (${firstName})`;
        navLoginLink.href = "dashboard.html";
        navLoginLink.style.color = "#64ffda";
      }
    } else {
      // USUARIO NO LOGUEADO:
      document.body.classList.remove("is-logged-in");
      document.body.classList.remove("sidebar-open");

      if (userInfo) userInfo.style.display = "none";
      if (btnLogin) btnLogin.style.display = "flex";
      if (btnLogout) btnLogout.style.display = "none";

      if (navLoginLink) {
        navLoginLink.innerHTML = "Mi Cuenta / Login";
        navLoginLink.href = "login.html";
        navLoginLink.style.color = "#ffeb3b";
      }
    }
  });
});
