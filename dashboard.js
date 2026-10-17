import { checkAuthState, logoutUser } from "./auth.js";
import { initTermsSimulator } from "./terms-simulator.js";
import { 
  db, 
  doc, 
  setDoc,
  writeBatch,
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection, 
  addDoc, 
  getDocs,
  getDoc,
  query,
  where
} from "./firebase-confi.js";

// ================= ESTADO GLOBAL =================
let currentUser = null;
let currentUserData = null;
let products = [];
let orders = [];
let withdrawals = [];
let cart = [];
let favorites = [];
let notifications = [];
let currentCategoryFilter = "all";
const productCategories = new Set([
  "Tecnología", "Moda", "Hogar", "Belleza", "Deportes", "Accesorios", "Juguetes"
]);
const legacyStorageKeys = [
  "paynex_products", "paynex_cart", "paynex_favorites", "paynex_buyer_orders",
  "paynex_seller_orders", "paynex_transactions", "paynex_balance"
];

function clearLegacyStorage() {
  legacyStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`No se pudo eliminar el dato local heredado ${key}:`, error);
    }
  });
}

function storageKey(name) {
  return currentUser ? `paynex_${name}_${currentUser.uid}` : null;
}

function readUserStorage(name, fallback) {
  const key = storageKey(name);
  if (!key) return fallback;
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn(`No se pudo leer el almacenamiento local de ${name}:`, error);
    return fallback;
  }
}

function saveUserStorage(name, value) {
  const key = storageKey(name);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`No se pudo guardar ${name} en este dispositivo:`, error);
    showToast("No se pudieron guardar los cambios en este dispositivo.");
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function productImageUrl(value) {
  const image = String(value || "");
  return /^img\/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|gif|svg)$/.test(image) || /^https:\/\//i.test(image)
    ? escapeHTML(image)
    : "img/p_iphone_hq.png";
}

function isValidProduct(id, product) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id)
    && typeof product.sellerId === "string"
    && typeof product.sellerName === "string"
    && product.sellerName.length > 0
    && product.sellerName.length <= 80
    && typeof product.name === "string"
    && product.name.length > 0
    && product.name.length <= 120
    && productCategories.has(product.category)
    && Number.isSafeInteger(product.price)
    && product.price > 0
    && product.price <= 1000000000
    && Number.isInteger(product.stock)
    && product.stock >= 0
    && product.stock <= 100000
    && typeof product.image === "string"
    && product.image.length <= 2048
    && ( /^img\/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|gif|svg)$/.test(product.image) || /^https:\/\/.+$/i.test(product.image) )
    && product.status === "Activo";
}

async function loadProducts() {
  const publicProducts = await getDocs(query(
    collection(db, "products"),
    where("status", "==", "Activo")
  ));
  const ownProducts = await getDocs(query(
    collection(db, "products"),
    where("sellerId", "==", currentUser.uid)
  ));
  const byId = new Map();
  [...publicProducts.docs, ...ownProducts.docs].forEach(productDoc => {
    const product = productDoc.data();
    if (!isValidProduct(productDoc.id, product)) {
      console.warn("Se omitió una publicación con datos inválidos:", productDoc.id);
      return;
    }
    byId.set(productDoc.id, { id: productDoc.id, ...product });
  });
  products = [...byId.values()];
  renderProducts();
  renderFavorites();
  renderCart();
  renderSellerDashboard();
}

// ================= INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
  clearLegacyStorage();
  initAuth();
  initNavigation();
  initCarousel();
  initSearch();
  initCategories();
  renderProducts();
  renderCart();
  renderFavorites();
  renderBuyerOrders();
  renderSellerDashboard();
  initCartDrawer();
  initModals();
  initWithdrawForm();
  initProfile();

  // Verificar si viene una búsqueda en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");
  if (searchParam) {
    const searchInput = document.getElementById("topSearchInput");
    if (searchInput) {
      searchInput.value = searchParam;
      filterProducts(searchParam);
    }
  }
});

// ================= 1. AUTENTICACIÓN Y SESIÓN =================
function initAuth() {
  checkAuthState((user, userData) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    currentUser = user;
    currentUserData = userData;
    const firstName = userData.firstName || user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Usuario";
    const lastName = userData.lastName || user.displayName?.split(" ").slice(1).join(" ") || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const candidatePhoto = typeof userData.photoURL === "string" ? userData.photoURL
      : typeof user.photoURL === "string" ? user.photoURL : "";
    const photo = candidatePhoto.startsWith("https://") || /^img\/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|gif|svg)$/.test(candidatePhoto)
      ? candidatePhoto
      : "img/register_panel.png";
    const headerUserName = document.getElementById("headerUserName");
    const headerUserAvatar = document.getElementById("headerUserAvatar");
    const profileDisplayName = document.getElementById("profileDisplayName");
    const profileUserAvatar = document.getElementById("profileUserAvatar");
    const profileFullNameInput = document.getElementById("profileFullNameInput");
    const profileEmailInput = document.getElementById("profileEmailInput");

    cart = readUserStorage("cart", []).filter(item =>
      item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100
    );
    favorites = readUserStorage("favorites", []).filter(id => typeof id === "string");
    if (headerUserName) headerUserName.textContent = fullName;
    if (headerUserAvatar) headerUserAvatar.src = photo;
    if (profileDisplayName) profileDisplayName.textContent = fullName;
    if (profileUserAvatar) profileUserAvatar.src = photo;
    if (profileFullNameInput) profileFullNameInput.value = fullName;
    if (profileEmailInput) profileEmailInput.value = user.email || "";
    const headerUserRole = document.getElementById("headerUserRole");
    if (headerUserRole) headerUserRole.textContent = userData.role === "vendedor" ? "Vendedor" : "Cliente";

    document.querySelectorAll('[data-view="mis-ventas"]').forEach(item => {
      item.style.display = userData.role === "vendedor" ? "" : "none";
    });
    const sellerView = document.getElementById("view-mis-ventas");
    if (sellerView && userData.role !== "vendedor") sellerView.style.display = "none";
    const createStoreButton = document.getElementById("btnSidebarCreateStore");
    if (createStoreButton && userData.role !== "vendedor") createStoreButton.style.display = "none";

    loadProducts().catch(error => {
      console.error("No se pudo cargar el catálogo de Firestore:", error);
      showToast("No fue posible cargar el catálogo. Intenta de nuevo más tarde.");
    });
    loadCommerceData().catch(error => {
      console.error("No se pudieron cargar los pedidos o retiros simulados:", error);
      showToast("No se pudo cargar el historial comercial. Actualiza la página e inténtalo de nuevo.");
    });
  }, error => {
    console.error("No se pudo verificar el perfil para el panel:", error);
    window.location.replace("login.html");
  });

  // Cerrar sesión
  const btnLogout = document.getElementById("btnLogoutSession");
  const btnConfigLogout = document.getElementById("btnConfigLogout");
  const handleLogout = (e) => {
    e.preventDefault();
    logoutUser()
      .then(() => window.location.replace("index.html"))
      .catch(error => {
        console.error("Error al cerrar sesión:", error);
        showToast("No fue posible cerrar la sesión. Inténtalo de nuevo.");
      });
  };

  if (btnLogout) btnLogout.addEventListener("click", handleLogout);
  if (btnConfigLogout) btnConfigLogout.addEventListener("click", handleLogout);
}

// ================= 2. NAVEGACIÓN Y VISTAS =================
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const viewContainers = document.querySelectorAll(".view-container");

  window.switchView = function(viewId) {
    viewContainers.forEach(container => {
      container.classList.remove("active");
    });
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    navItems.forEach(item => {
      if (item.getAttribute("data-view") === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Cerrar dropdown de usuario si está abierto
    const userMenu = document.getElementById("userDropdownPanel");
    if (userMenu) userMenu.classList.remove("open");
  };

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const viewId = item.getAttribute("data-view");
      switchView(viewId);
    });
  });

  // Enlaces que navegan a vistas (ej. Ver todas)
  document.querySelectorAll("[data-view]:not(.nav-item)").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const viewId = el.getAttribute("data-view");
      switchView(viewId);
    });
  });

  // Botón Crear Tienda en sidebar
  const btnCreateStore = document.getElementById("btnSidebarCreateStore");
  if (btnCreateStore) {
    btnCreateStore.addEventListener("click", () => {
      switchView("mis-ventas");
      switchSellerSubView("productos");
      openAddProductModal();
    });
  }

  // Botón Explorar Categorías en Hero
  const btnExplore = document.getElementById("btnExploreBanner");
  if (btnExplore) {
    btnExplore.addEventListener("click", () => {
      switchView("categorias");
    });
  }

  // Toggle Menú Usuario
  const userMenuBtn = document.getElementById("btnUserMenuToggle");
  const userDropdown = document.getElementById("userDropdownPanel");
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("open");
    });
  }

  // Toggle Notificaciones
  const btnNotifs = document.getElementById("btnHeaderNotifs");
  const notifsPopup = document.getElementById("notificationsPopup");
  if (btnNotifs && notifsPopup) {
    btnNotifs.addEventListener("click", (e) => {
      e.stopPropagation();
      notifsPopup.classList.toggle("open");
    });
  }

  // Cerrar popups al hacer clic fuera
  document.addEventListener("click", () => {
    if (userDropdown) userDropdown.classList.remove("open");
    if (notifsPopup) notifsPopup.classList.remove("open");
  });

  // Subpestañas en Mis Ventas
  const sellerTabBtns = document.querySelectorAll(".seller-tab-btn");
  sellerTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const subview = btn.getAttribute("data-subview");
      switchSellerSubView(subview);
    });
  });

  const linkWithdrawShortcut = document.getElementById("linkWithdrawShortcut");
  if (linkWithdrawShortcut) {
    linkWithdrawShortcut.addEventListener("click", () => {
      switchSellerSubView("finanzas");
    });
  }
}

function initCarousel() {
  const image = document.querySelector(".banner-3d-img");
  const previous = document.getElementById("btnPrevSlide");
  const next = document.getElementById("btnNextSlide");
  const dots = [...document.querySelectorAll(".carousel-dot")];
  if (!image || !previous || !next || !dots.length) return;

  const slides = [
    { src: "img/mockup2_banner_3d_2x.png", alt: "Productos PayNex" },
    { src: "img/banner_hero_3d.png", alt: "Tecnología y productos" },
    { src: "img/hero1_phone_cards_clean_2x.png", alt: "Catálogo PayNex en un teléfono" },
    { src: "img/mockup1_hero_phone.png", alt: "Productos destacados" }
  ].slice(0, dots.length);
  let activeSlide = 0;

  const showSlide = index => {
    activeSlide = (index + slides.length) % slides.length;
    image.src = slides[activeSlide].src;
    image.alt = slides[activeSlide].alt;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === activeSlide);
      dot.setAttribute("aria-pressed", String(dotIndex === activeSlide));
    });
  };

  previous.addEventListener("click", () => showSlide(activeSlide - 1));
  next.addEventListener("click", () => showSlide(activeSlide + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
}

function switchSellerSubView(subviewId) {
  document.querySelectorAll(".seller-tab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-subview") === subviewId);
  });
  document.querySelectorAll(".seller-subview").forEach(v => {
    v.classList.toggle("active", v.id === `subview-${subviewId}`);
  });
}

// ================= 3. RENDERIZADO DE PRODUCTOS =================
function renderProducts(searchTerm) {
  const featuredGrid = document.getElementById("featuredProductsGrid");
  const catalogGrid = document.getElementById("allProductsCatalogGrid");

  const activeSearch = searchTerm !== undefined
    ? searchTerm
    : document.getElementById("topSearchInput")?.value || "";
  const term = activeSearch.trim().toLocaleLowerCase();
  const filtered = products.filter(product =>
    (currentCategoryFilter === "all" || product.category.toLowerCase() === currentCategoryFilter.toLowerCase())
    && (!term || product.name.toLocaleLowerCase().includes(term)
      || product.category.toLocaleLowerCase().includes(term)
      || product.sellerName.toLocaleLowerCase().includes(term))
  );

  const html = filtered.map(prod => {
    const id = escapeHTML(prod.id);
    const name = escapeHTML(prod.name);
    const isFav = favorites.includes(prod.id);
    const stock = Number.isInteger(prod.stock) ? prod.stock : 0;

    return `
      <div class="product-item-card" data-product-id="${id}">
        <button type="button" class="btn-fav-heart ${isFav ? 'active' : ''}" data-product-action="favorite" data-product-id="${id}" title="Añadir a favoritos">
          <svg width="16" height="16" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>

        <div class="product-img-wrap">
          <img src="${productImageUrl(prod.image)}" alt="${name}" loading="lazy">
        </div>

        <div class="product-info-wrap">
          <div class="product-item-title" title="${name}">${name}</div>
          <div class="product-rating">${escapeHTML(prod.category)} · ${stock} disponibles</div>
          <div class="product-rating">Vendedor: ${escapeHTML(prod.sellerName)}</div>
          <div class="product-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
        </div>

        <button type="button" class="btn-add-cart" data-product-action="cart" data-product-id="${id}" ${stock < 1 ? "disabled" : ""}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
          <span>${stock < 1 ? "Agotado" : "Agregar al carrito"}</span>
        </button>
      </div>
    `;
  }).join("");

  const content = html || `<p style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">${products.length ? "No se encontraron productos." : "Aún no hay productos publicados."}</p>`;
  [featuredGrid, catalogGrid].forEach(grid => {
    if (!grid) return;
    grid.innerHTML = content;
    grid.querySelectorAll("[data-product-action]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.productAction === "favorite") window.toggleFavorite(button.dataset.productId);
        if (button.dataset.productAction === "cart") window.addToCart(button.dataset.productId);
      });
    });
  });
}

// ================= 4. FAVORITOS =================
window.toggleFavorite = function(productId) {
  const index = favorites.indexOf(productId);
  const prod = products.find(p => p.id === productId);
  if (index > -1) {
    favorites.splice(index, 1);
    showToast(`Removido de favoritos`);
  } else {
    favorites.push(productId);
    showToast(`❤️ ${prod ? prod.name : 'Producto'} añadido a favoritos`);
  }

  saveUserStorage("favorites", favorites);
  renderProducts();
  renderFavorites();
};

function renderFavorites() {
  const favGrid = document.getElementById("favoritesProductsGrid");
  const favCount = document.getElementById("favoritesNavCount");

  if (favCount) {
    favCount.textContent = favorites.length;
    favCount.style.display = favorites.length > 0 ? "inline-block" : "none";
  }

  if (!favGrid) return;

  const favProducts = products.filter(p => favorites.includes(p.id));
  if (favProducts.length === 0) {
    favGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px;">
        <div style="font-size: 42px; margin-bottom: 12px;">🤍</div>
        <h3 style="font-size: 18px; margin-bottom: 6px;">No tienes productos en favoritos</h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 18px;">Explora el catálogo y presiona el corazón para guardar tus favoritos.</p>
        <button type="button" class="btn-primary-action" data-switch-view="inicio">Explorar productos</button>
      </div>
    `;
    favGrid.querySelector("[data-switch-view]")?.addEventListener("click", () => window.switchView("inicio"));
    return;
  }

  favGrid.innerHTML = favProducts.map(prod => `
    <div class="product-item-card">
      <button type="button" class="btn-fav-heart active" data-product-action="favorite" data-product-id="${escapeHTML(prod.id)}" title="Quitar de favoritos">
        <svg width="16" height="16" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </button>

      <div class="product-img-wrap">
        <img src="${productImageUrl(prod.image)}" alt="${escapeHTML(prod.name)}" loading="lazy">
      </div>

      <div class="product-info-wrap">
        <div class="product-item-title">${escapeHTML(prod.name)}</div>
        <div class="product-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
      </div>

      <button type="button" class="btn-add-cart" data-product-action="cart" data-product-id="${escapeHTML(prod.id)}" ${prod.stock < 1 ? "disabled" : ""}>
        <span>Agregar al carrito</span>
      </button>
    </div>
  `).join("");
  favGrid.querySelectorAll("[data-product-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.productAction === "favorite") window.toggleFavorite(button.dataset.productId);
      if (button.dataset.productAction === "cart") window.addToCart(button.dataset.productId);
    });
  });
}

// ================= 5. CARRITO DE COMPRAS =================
window.addToCart = function(productId) {
  const product = products.find(item => item.id === productId);
  if (!product || product.stock < 1) {
    showToast("Este producto ya no está disponible.");
    return;
  }
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast("No hay más unidades disponibles.");
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveUserStorage("cart", cart);
  renderCart();

  showToast(`🛍️ ${product.name} añadido al carrito`);
  openCartDrawer();
};

window.updateCartQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  } else {
    const product = products.find(item => item.id === productId);
    if (product && item.quantity > product.stock) item.quantity = product.stock;
  }

  saveUserStorage("cart", cart);
  renderCart();
};

window.removeFromCart = function(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveUserStorage("cart", cart);
  renderCart();
  showToast("Producto eliminado del carrito");
};

function renderCart() {
  const container = document.getElementById("cartItemsContainer");
  const badgeHeader = document.getElementById("headerCartBadge");
  const drawerCount = document.getElementById("cartDrawerItemsCount");
  const subtotalEl = document.getElementById("cartSubtotalText");
  const totalEl = document.getElementById("cartTotalText");

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (badgeHeader) {
    badgeHeader.textContent = totalQuantity;
    badgeHeader.style.display = totalQuantity > 0 ? "flex" : "none";
  }

  if (drawerCount) drawerCount.textContent = totalQuantity;

  let totalAmount = 0;

  if (cart.length === 0) {
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
          <div style="font-size: 38px; margin-bottom: 10px;">🛒</div>
          <strong>Tu carrito está vacío</strong>
          <p style="font-size: 13px; margin-top: 4px;">Agrega productos para comenzar a comprar.</p>
        </div>
      `;
    }
    if (subtotalEl) subtotalEl.textContent = "$0";
    if (totalEl) totalEl.textContent = "$0";
    return;
  }

  const itemsHtml = cart.map(item => {
    const prod = products.find(p => p.id === item.id);
    if (!prod) return "";

    const itemTotal = prod.price * item.quantity;
    totalAmount += itemTotal;

    return `
      <div class="cart-item-row">
        <div class="cart-item-thumb">
          <img src="${productImageUrl(prod.image)}" alt="${escapeHTML(prod.name)}">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHTML(prod.name)}</div>
          <div class="cart-item-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
          <div class="cart-qty-ctrl">
            <button type="button" class="btn-qty" data-cart-action="decrease" data-product-id="${escapeHTML(prod.id)}">-</button>
            <span style="font-size: 13px; font-weight: 700; min-width: 18px; text-align: center;">${item.quantity}</span>
            <button type="button" class="btn-qty" data-cart-action="increase" data-product-id="${escapeHTML(prod.id)}">+</button>
          </div>
        </div>
        <button type="button" class="btn-remove-cart" data-cart-action="remove" data-product-id="${escapeHTML(prod.id)}" title="Eliminar">🗑️</button>
      </div>
    `;
  }).join("");

  if (container) {
    container.innerHTML = itemsHtml;
    container.querySelectorAll("[data-cart-action]").forEach(button => {
      button.addEventListener("click", () => {
        const { productId, cartAction } = button.dataset;
        if (cartAction === "decrease") window.updateCartQty(productId, -1);
        if (cartAction === "increase") window.updateCartQty(productId, 1);
        if (cartAction === "remove") window.removeFromCart(productId);
      });
    });
  }
  const formattedTotal = `$ ${Number(totalAmount).toLocaleString("es-CO")}`;
  if (subtotalEl) subtotalEl.textContent = formattedTotal;
  if (totalEl) totalEl.textContent = formattedTotal;
}

function initCartDrawer() {
  const btnCart = document.getElementById("btnHeaderCart");
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartDrawerOverlay");
  const btnClose = document.getElementById("btnCloseCartDrawer");
  const btnCheckout = document.getElementById("btnCheckoutCart");

  window.openCartDrawer = function() {
    if (drawer) drawer.classList.add("open");
    if (overlay) overlay.classList.add("open");
  };

  window.closeCartDrawer = function() {
    if (drawer) drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
  };

  if (btnCart) btnCart.addEventListener("click", openCartDrawer);
  if (btnClose) btnClose.addEventListener("click", closeCartDrawer);
  if (overlay) overlay.addEventListener("click", closeCartDrawer);

  if (btnCheckout) {
    btnCheckout.addEventListener("click", simulatePurchase);
  }
}

// ================= 6. VISTA COMPRADOR: MIS COMPRAS =================
function orderDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("es-CO")
    : "Fecha no disponible";
}

function orderStatusClass(status) {
  if (status === "Entregado") return "delivered";
  if (status === "Enviado") return "sent";
  if (status === "En proceso") return "processing";
  if (status === "En bodega") return "warehouse";
  return "pending";
}

// ================= NOTIFICACIONES EN TIEMPO REAL =================
function renderNotifications() {
  const listContainer = document.getElementById("notifListContainer");
  const badge = document.getElementById("headerNotifBadge");
  if (!listContainer) return;

  const unreadCount = notifications.filter(n => !n.read).length;
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = String(unreadCount);
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  if (!notifications.length) {
    listContainer.innerHTML = `
      <div class="notif-item">
        <strong>Sin notificaciones pendientes</strong>
        <span>Aquí recibirás los avisos de tus pedidos y actualizaciones de estado.</span>
      </div>
    `;
    return;
  }

  const isSeller = currentUserData?.role === "vendedor";

  listContainer.innerHTML = notifications.map(notif => `
    <div class="notif-item" style="border-left: 3px solid #4f46e5; padding: 10px; margin-bottom: 8px; background: ${notif.read ? '#fff' : '#f8fafc'}; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <strong style="font-size: 13px; color: #0f172a;">${escapeHTML(notif.title)}</strong>
        <span style="font-size: 11px; color: #64748b;">${notif.time || 'Reciente'}</span>
      </div>
      <p style="font-size: 12px; color: #475569; margin: 4px 0;">${escapeHTML(notif.message)}</p>
      ${notif.orderId ? (
        isSeller ? `
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; background: #eef2ff; padding: 6px 10px; border-radius: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #3730a3;">⚙️ Proveedor - Cambiar estado:</span>
            <select class="input-custom notif-status-picker" data-notif-order-id="${escapeHTML(notif.orderId)}" style="padding: 3px 6px; font-size: 11.5px; width: auto; background: #fff;">
              <option value="En proceso" ${notif.currentStatus === "En proceso" ? "selected" : ""}>En proceso</option>
              <option value="En bodega" ${notif.currentStatus === "En bodega" ? "selected" : ""}>En bodega</option>
              <option value="Enviado" ${notif.currentStatus === "Enviado" ? "selected" : ""}>Enviado</option>
              <option value="Entregado" ${notif.currentStatus === "Entregado" ? "selected" : ""}>Entregado</option>
            </select>
          </div>
        ` : `
          <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; color: #64748b;">Estado del producto:</span>
              <span class="status-badge ${orderStatusClass(notif.currentStatus || 'En proceso')}" style="font-size: 11px; padding: 2px 8px;">${escapeHTML(notif.currentStatus || 'En proceso')}</span>
            </div>
            <button type="button" class="btn-notif-support" data-notif-order-id="${escapeHTML(notif.orderId)}" style="border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;">
              🛡️ Mediación PayNex
            </button>
          </div>
        `
      ) : ''}
    </div>
  `).join("");

  listContainer.querySelectorAll(".notif-status-picker").forEach(select => {
    select.addEventListener("change", () => {
      const orderId = select.dataset.notifOrderId;
      window.updateOrderStatus(orderId, select.value);
    });
  });

  listContainer.querySelectorAll(".btn-notif-support").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.notifOrderId;
      window.openSupportModal(orderId);
    });
  });
}

function addNotification(title, message, orderId = null, currentStatus = "En proceso") {
  const notif = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title,
    message,
    orderId,
    currentStatus,
    read: false,
    time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    createdAt: new Date().toISOString()
  };
  notifications = [notif, ...notifications].slice(0, 30);
  saveUserStorage("notifications", notifications);
  renderNotifications();
}

async function loadCommerceData() {
  let remoteOrders = [];
  try {
    const [buyerOrders, sellerOrders] = await Promise.all([
      getDocs(query(collection(db, "orders"), where("buyerId", "==", currentUser.uid))),
      getDocs(query(collection(db, "orders"), where("sellerId", "==", currentUser.uid)))
    ]);
    const orderById = new Map();
    [...buyerOrders.docs, ...sellerOrders.docs].forEach(snapshot => {
      orderById.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
    });
    remoteOrders = [...orderById.values()];
  } catch (error) {
    console.warn("No se pudieron cargar pedidos remotos de Firestore:", error);
  }

  // Cargar pedidos locales de contingencia/demo
  const localDemoOrders = readUserStorage("demo_orders", []);
  const allOrdersMap = new Map();
  remoteOrders.forEach(o => allOrdersMap.set(o.id, o));
  localDemoOrders.forEach(o => allOrdersMap.set(o.id, o));
  orders = [...allOrdersMap.values()];

  if (currentUserData?.role === "vendedor") {
    try {
      const withdrawalSnapshots = await getDocs(query(
        collection(db, "withdrawals"),
        where("sellerId", "==", currentUser.uid)
      ));
      withdrawals = withdrawalSnapshots.docs.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }));
    } catch (error) {
      console.warn("No se pudieron cargar retiros de Firestore:", error);
    }
  }

  notifications = readUserStorage("notifications", []);
  renderNotifications();
  renderBuyerOrders();
  renderSellerDashboard();
}

async function simulatePurchase() {
  const button = document.getElementById("btnCheckoutCart");
  if (!currentUser || cart.length === 0) {
    showToast("Agrega al menos un producto al carrito antes de confirmar tu compra.");
    return;
  }
  if (cart.length > 20) {
    showToast("El pedido admite hasta 20 productos distintos por compra.");
    return;
  }

  // Validación de Términos y Condiciones
  const termsCheckbox = document.getElementById("cartAcceptTermsCheckbox");
  if (termsCheckbox && !termsCheckbox.checked) {
    showToast("Debes aceptar los Términos y Condiciones para realizar tu pedido.");
    return;
  }

  if (button) button.disabled = true;

  try {
    const buyerName = `${currentUserData?.firstName || ""} ${currentUserData?.lastName || ""}`.trim()
      || currentUser.email?.split("@")[0]
      || "Comprador";
    const itemsToOrder = [];

    for (const cartItem of cart) {
      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > 100) {
        throw new Error("Cantidad inválida en el carrito.");
      }
      const product = products.find(p => p.id === cartItem.id);
      if (!product) {
        throw new Error("Uno de los productos ya no está disponible.");
      }
      const total = product.price * cartItem.quantity;
      if (!Number.isSafeInteger(total) || total <= 0) throw new Error("El total del carrito no es válido.");

      itemsToOrder.push({
        buyerId: currentUser.uid,
        buyerName: buyerName.slice(0, 120),
        sellerId: product.sellerId || "paynex-store",
        sellerName: product.sellerName || "Vendedor PayNex",
        productId: product.id,
        productName: product.name,
        image: product.image,
        quantity: cartItem.quantity,
        unitPrice: product.price,
        total,
        status: "En proceso", // Estado de inicio solicitado
        simulation: false,
        termsAccepted: true,
        termsVersion: "2.4-2026"
      });
    }

    let purchaseSuccess = false;
    let newCreatedOrders = [];

    // Intento 1: Registro en Firestore (Modo Producción)
    try {
      const batch = writeBatch(db);
      for (const item of itemsToOrder) {
        const orderRef = doc(collection(db, "orders"));
        newCreatedOrders.push({
          ...item,
          id: orderRef.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        batch.set(orderRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      purchaseSuccess = true;
    } catch (firestoreError) {
      console.warn("Firestore rechazó el pedido o permisos pendientes en Google Cloud:", firestoreError);
      // Fallback automático al Modo Contingencia / Demo Seguro
      newCreatedOrders = itemsToOrder.map((item, idx) => ({
        ...item,
        id: "ORD-" + Date.now().toString(36).toUpperCase() + "-" + (idx + 1),
        simulation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const existingDemos = readUserStorage("demo_orders", []);
      saveUserStorage("demo_orders", [...newCreatedOrders, ...existingDemos]);
      purchaseSuccess = true;
    }

    if (purchaseSuccess) {
      orders = [...newCreatedOrders, ...orders];

      // Disparar notificación para cada pedido generado
      newCreatedOrders.forEach(order => {
        addNotification(
          `📦 ¡Pedido confirmado! #${order.id.slice(0, 8).toUpperCase()}`,
          `Compra de ${order.productName} (x${order.quantity}) registrada con éxito. El proveedor preparará el despacho y actualizará el estado de tu producto.`,
          order.id,
          "En proceso"
        );
      });

      cart = [];
      saveUserStorage("cart", cart);
      renderCart();
      renderBuyerOrders();
      renderSellerDashboard();
      window.closeCartDrawer?.();

      showToast("🎉 ¡Pedido registrado con éxito! Revisa tus pedidos y notificaciones.");
    }
  } catch (error) {
    console.error("Error en el proceso de compra:", error);
    showToast(error.message || "No se pudo procesar la compra.");
  } finally {
    if (button) button.disabled = false;
  }
}

window.simulatePurchase = simulatePurchase;
window.executePurchase = simulatePurchase;

function renderBuyerOrders() {
  const tbody = document.getElementById("buyerOrdersTableBody");
  const countEl = document.getElementById("buyerTotalPurchasesCount");
  const processingEl = document.getElementById("buyerProcessingCount");
  const inTransitEl = document.getElementById("buyerInTransitCount");
  const deliveredEl = document.getElementById("buyerDeliveredCount");

  if (!tbody) return;
  const buyerOrders = orders
    .filter(order => order.buyerId === currentUser?.uid)
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime());
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime());
      return timeB - timeA;
    });

  if (countEl) countEl.textContent = String(buyerOrders.length);
  if (processingEl) processingEl.textContent = String(buyerOrders.filter(order => ["En proceso", "En bodega", "Pendiente de envío", "Preparando"].includes(order.status)).length);
  if (inTransitEl) inTransitEl.textContent = String(buyerOrders.filter(order => order.status === "Enviado").length);
  if (deliveredEl) deliveredEl.textContent = String(buyerOrders.filter(order => order.status === "Entregado").length);

  tbody.innerHTML = buyerOrders.length ? buyerOrders.map(order => `
    <tr>
      <td><strong>#${escapeHTML(order.id.slice(0, 8).toUpperCase())}</strong></td>
      <td>${escapeHTML(order.productName)} × ${Number(order.quantity)}</td>
      <td>${escapeHTML(order.sellerName || "Proveedor PayNex")}</td>
      <td><strong>$ ${Number(order.total).toLocaleString("es-CO")}</strong></td>
      <td>${orderDate(order.createdAt)}</td>
      <td>
        <span class="status-badge ${orderStatusClass(order.status)}">${escapeHTML(order.status)}</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
          <span>🚚</span> <span>Actualizado por proveedor</span>
        </div>
      </td>
      <td>
        <button type="button" class="btn-primary-action btn-open-support-modal" data-order-id="${escapeHTML(order.id)}" style="padding: 6px 12px; font-size: 11.5px; background: #4f46e5; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
          <span>🛡️ Soporte & Mediación</span>
        </button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">Aún no tienes compras registradas. Explora la tienda y haz tu primer pedido.</td></tr>`;

  tbody.querySelectorAll(".btn-open-support-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.orderId;
      window.openSupportModal(orderId);
    });
  });
}

// ================= 7. VISTA VENDEDOR: MIS VENTAS & FINANZAS =================
function renderSellerDashboard() {
  const totalSalesEl = document.getElementById("kpiTotalSales");
  const activeProductsEl = document.getElementById("kpiActiveProducts");
  const balanceEl = document.getElementById("kpiAvailableBalance");
  const financeBalanceEl = document.getElementById("financeBalanceAmount");

  const ownProducts = currentUser ? products.filter(product => product.sellerId === currentUser.uid) : [];
  const sellerOrders = orders
    .filter(order => order.sellerId === currentUser?.uid)
    .sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0)
      - (a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0));
  const deliveredTotal = sellerOrders
    .filter(order => order.status === "Entregado")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const withdrawnTotal = withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
  const availableBalance = Math.max(0, deliveredTotal - withdrawnTotal);
  const formatMoney = value => `$ ${value.toLocaleString("es-CO")}`;
  if (totalSalesEl) totalSalesEl.textContent = formatMoney(sellerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0));
  if (activeProductsEl) activeProductsEl.textContent = ownProducts.length;
  if (balanceEl) balanceEl.textContent = formatMoney(availableBalance);
  if (financeBalanceEl) financeBalanceEl.textContent = formatMoney(availableBalance);
  const shippedOrdersEl = document.getElementById("kpiShippedOrders");
  if (shippedOrdersEl) shippedOrdersEl.textContent = String(sellerOrders.filter(order => order.status === "Enviado").length);

  const prodTbody = document.getElementById("sellerProductsTableBody");
  if (prodTbody) {
    prodTbody.innerHTML = ownProducts.length ? ownProducts.map(prod => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${productImageUrl(prod.image)}" alt="" style="width: 36px; height: 36px; object-fit: contain; border-radius: 8px;">
            <strong>${escapeHTML(prod.name)}</strong>
          </div>
        </td>
        <td>${escapeHTML(prod.category)}</td>
        <td>$ ${Number(prod.price).toLocaleString("es-CO")}</td>
        <td>${prod.stock} un.</td>
        <td><span class="status-badge delivered">Activo</span></td>
        <td>
          <button type="button" style="background:none; border:none; cursor:pointer; margin-right:8px;" data-product-action="edit" data-product-id="${escapeHTML(prod.id)}" title="Editar">✏️</button>
          <button type="button" style="background:none; border:none; cursor:pointer; color:#ef4444;" data-product-action="delete" data-product-id="${escapeHTML(prod.id)}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6" style="text-align:center;padding:24px;">Aún no has publicado productos.</td></tr>`;
    prodTbody.querySelectorAll("[data-product-action]").forEach(button => {
      button.addEventListener("click", () => {
        const productId = button.dataset.productId;
        if (button.dataset.productAction === "edit") window.editProduct(productId);
        if (button.dataset.productAction === "delete") window.deleteProduct(productId);
      });
    });
  }

  const ordersTbody = document.getElementById("sellerReceivedOrdersTableBody");
  if (ordersTbody) {
    ordersTbody.innerHTML = sellerOrders.length ? sellerOrders.map(order => `
      <tr>
        <td><strong>#${escapeHTML(order.id.slice(0, 8).toUpperCase())}</strong></td>
        <td>${escapeHTML(order.productName)} × ${Number(order.quantity)}</td>
        <td>${escapeHTML(order.buyerName || "Comprador")}</td>
        <td><strong>$ ${Number(order.total).toLocaleString("es-CO")}</strong></td>
        <td>${orderDate(order.createdAt)}</td>
        <td><span class="status-badge ${orderStatusClass(order.status)}">${escapeHTML(order.status)}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <select class="input-custom seller-status-picker" data-seller-order-id="${escapeHTML(order.id)}" style="padding: 4px 8px; font-size: 12px; width: auto; min-width: 110px;">
              <option value="En proceso" ${order.status === "En proceso" ? "selected" : ""}>En proceso</option>
              <option value="En bodega" ${order.status === "En bodega" ? "selected" : ""}>En bodega</option>
              <option value="Enviado" ${order.status === "Enviado" ? "selected" : ""}>Enviado</option>
              <option value="Entregado" ${order.status === "Entregado" ? "selected" : ""}>Entregado</option>
            </select>
            <button type="button" class="btn-primary-action btn-seller-status-update" data-seller-order-id="${escapeHTML(order.id)}" style="padding: 4px 10px; font-size: 11px;">Actualizar</button>
          </div>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7" style="text-align:center;padding:24px;">Aún no tienes pedidos recibidos.</td></tr>`;

    ordersTbody.querySelectorAll(".btn-seller-status-update").forEach(button => {
      button.addEventListener("click", () => {
        const orderId = button.dataset.sellerOrderId;
        const select = button.closest("tr")?.querySelector(".seller-status-picker");
        if (select) window.updateOrderStatus(orderId, select.value);
      });
    });

    ordersTbody.querySelectorAll(".seller-status-picker").forEach(select => {
      select.addEventListener("change", () => {
        const orderId = select.dataset.sellerOrderId;
        window.updateOrderStatus(orderId, select.value);
      });
    });
  }

  const txList = document.getElementById("transactionsListWrap");
  if (txList) {
    txList.innerHTML = withdrawals.length ? withdrawals
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .map(withdrawal => `
        <div class="notif-item">
          <strong>Retiro simulado a Nequi · $ ${Number(withdrawal.amount).toLocaleString("es-CO")}</strong>
          <span>Celular terminado en ${escapeHTML(withdrawal.accountLast4)} · ${orderDate(withdrawal.createdAt)} · No se transfirió dinero.</span>
        </div>
      `).join("")
      : `<p style="color:var(--text-muted);">Aún no hay retiros de prueba.</p>`;
  }
}

window.updateOrderStatus = async function(orderId, newStatus) {
  const validStatuses = ["En proceso", "En bodega", "Enviado", "Entregado"];
  if (!validStatuses.includes(newStatus)) {
    showToast("Estado no válido.");
    return;
  }
  const order = orders.find(item => item.id === orderId);
  if (!order) {
    showToast("Pedido no encontrado.");
    return;
  }

  // Validación estricta de roles: Solo los proveedores/vendedores autorizados pueden cambiar el estado
  const isAuthorizedProvider = currentUserData?.role === "vendedor" || order.sellerId === currentUser?.uid;
  if (!isAuthorizedProvider) {
    showToast("⛔ Solo los proveedores autorizados pueden cambiar el estado del producto.");
    return;
  }

  // Intento de actualización en Firestore
  if (!order.id.startsWith("ORD-") && !order.id.startsWith("DEMO-")) {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn("No se pudo actualizar en Firestore, aplicando localmente:", error);
    }
  }

  // Actualizar en pedidos locales de demo/contingencia
  const localDemos = readUserStorage("demo_orders", []);
  const demoIdx = localDemos.findIndex(o => o.id === orderId);
  if (demoIdx !== -1) {
    localDemos[demoIdx].status = newStatus;
    localDemos[demoIdx].updatedAt = new Date().toISOString();
    saveUserStorage("demo_orders", localDemos);
  }

  // Actualizar estado en memoria
  order.status = newStatus;
  order.updatedAt = new Date();

  // Actualizar notificaciones asociadas
  notifications = notifications.map(n => n.orderId === orderId ? { ...n, currentStatus: newStatus } : n);
  saveUserStorage("notifications", notifications);

  addNotification(
    `📦 Estado de Pedido Actualizado`,
    `El pedido #${order.id.slice(0, 8).toUpperCase()} (${order.productName}) ahora está: ${newStatus}`,
    order.id,
    newStatus
  );

  renderBuyerOrders();
  renderSellerDashboard();
  renderNotifications();
  showToast(`Estado del pedido actualizado: ${newStatus}.`);
};

window.updateSellerOrderStatus = window.updateOrderStatus;

window.deleteProduct = async function(prodId) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    try {
      const product = products.find(item => item.id === prodId && item.sellerId === currentUser?.uid);
      if (!product) throw new Error("No tienes permiso para eliminar este producto.");
      await deleteDoc(doc(db, "products", prodId));
      products = products.filter(item => item.id !== prodId);
      favorites = favorites.filter(id => id !== prodId);
      cart = cart.filter(item => item.id !== prodId);
      saveUserStorage("favorites", favorites);
      saveUserStorage("cart", cart);
      renderProducts();
      renderFavorites();
      renderCart();
      renderSellerDashboard();
      showToast("Producto eliminado");
    } catch (error) {
      console.error("No se pudo eliminar el producto:", error);
      showToast("No se pudo eliminar el producto. Verifica tu conexión y permisos.");
    }
  }
};

// ================= 8. FORMULARIO DE FINANZAS Y RETIROS =================
function initWithdrawForm() {
  const form = document.getElementById("financeWithdrawForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (currentUserData?.role !== "vendedor" || !currentUser) {
      showToast("Solo los vendedores pueden simular retiros.");
      return;
    }
    const account = document.getElementById("withdrawAccountInput").value.trim();
    const amount = Number(document.getElementById("withdrawAmountInput").value);
    const deliveredTotal = orders
      .filter(order => order.sellerId === currentUser.uid && order.status === "Entregado")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    const availableBalance = Math.max(0, deliveredTotal
      - withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0));
    if (!/^\d{10}$/.test(account) || !Number.isSafeInteger(amount) || amount < 10000
      || amount > availableBalance) {
      showToast(amount > availableBalance
        ? "El monto supera el saldo simulado disponible."
        : "Ingresa un celular Nequi de 10 dígitos y un monto válido (mínimo $10.000).");
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const withdrawal = {
        sellerId: currentUser.uid,
        amount,
        method: "Nequi",
        accountLast4: account.slice(-4),
        status: "Simulado",
        simulation: true,
        createdAt: serverTimestamp()
      };
      const withdrawalRef = await addDoc(collection(db, "withdrawals"), withdrawal);
      withdrawals = [{ ...withdrawal, id: withdrawalRef.id, createdAt: new Date() }, ...withdrawals];
      form.reset();
      renderSellerDashboard();
      showToast("Retiro de prueba registrado. No se envió dinero a Nequi.");
    } catch (error) {
      console.error("No se pudo registrar el retiro simulado:", error);
      showToast(error.code === "permission-denied"
        ? "Firestore rechazó el retiro. Publica las reglas actuales de firestore.rules."
        : "No se pudo registrar el retiro de prueba. Inténtalo de nuevo.");
    } finally {
      submitButton.disabled = false;
    }
  });
}

// ================= 9. MODALES Y PUBLICAR PRODUCTO =================
function initModals() {
  const modal = document.getElementById("addProductModal");
  const btnOpen = document.getElementById("btnOpenAddProduct");
  const btnClose = document.getElementById("btnCloseAddProductModal");
  const btnCancel = document.getElementById("btnCancelAddProduct");
  const form = document.getElementById("productForm");

  window.openAddProductModal = function() {
    if (currentUserData?.role !== "vendedor") {
      showToast("Solo las cuentas de vendedor pueden publicar productos.");
      return;
    }
    if (modal) modal.classList.add("open");
  };

  window.closeAddProductModal = function() {
    if (modal) modal.classList.remove("open");
    if (form) form.reset();
    document.getElementById("prodEditId").value = "";
    document.getElementById("modalProductTitle").textContent = "Publicar Nuevo Producto";
  };

  if (btnOpen) btnOpen.addEventListener("click", openAddProductModal);
  if (btnClose) btnClose.addEventListener("click", closeAddProductModal);
  if (btnCancel) btnCancel.addEventListener("click", closeAddProductModal);

  window.editProduct = function(id) {
    const prod = products.find(p => p.id === id && p.sellerId === currentUser?.uid);
    if (!prod) return;

    document.getElementById("prodEditId").value = prod.id;
    document.getElementById("prodTitleInput").value = prod.name;
    document.getElementById("prodCategorySelect").value = prod.category;
    document.getElementById("prodPriceInput").value = prod.price;
    document.getElementById("prodStockInput").value = prod.stock;
    document.getElementById("prodImageInput").value = prod.image;
    document.getElementById("modalProductTitle").textContent = "Editar Producto";
    openAddProductModal();
  };

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (currentUserData?.role !== "vendedor" || !currentUser) {
        showToast("Solo las cuentas de vendedor pueden publicar productos.");
        return;
      }
      const editId = document.getElementById("prodEditId").value;
      const title = document.getElementById("prodTitleInput").value.trim();
      const category = document.getElementById("prodCategorySelect").value;
      const price = Number(document.getElementById("prodPriceInput").value);
      const stock = Number(document.getElementById("prodStockInput").value);
      const image = document.getElementById("prodImageInput").value.trim() || "img/p_iphone_hq.png";
      if (!title || title.length > 120 || !Number.isSafeInteger(price) || price < 1 || price > 1000000000
        || !Number.isInteger(stock) || stock < 0 || stock > 100000
        || !(/^img\/[A-Za-z0-9_-]+[.](png|jpg|jpeg|webp|gif|svg)$/.test(image) || /^https:\/\/.+$/.test(image))
        || image.length > 2048) {
        showToast("Revisa el nombre, precio, inventario y URL de imagen.");
        return;
      }

      const fullSellerName = `${currentUserData.firstName} ${currentUserData.lastName}`.trim();
      const sellerName = fullSellerName.length <= 80 ? fullSellerName : currentUserData.username;
      const productData = {
        sellerId: currentUser.uid,
        sellerName,
        name: title,
        category,
        price,
        stock,
        image,
        status: "Activo"
      };

      try {
        if (editId) {
          const existing = products.find(product => product.id === editId && product.sellerId === currentUser.uid);
          if (!existing) throw new Error("No tienes permiso para editar este producto.");
          await updateDoc(doc(db, "products", editId), {
            ...productData,
            createdAt: existing.createdAt,
            updatedAt: serverTimestamp()
          });
          products = products.map(product => product.id === editId
            ? { ...product, ...productData }
            : product);
          showToast("Producto actualizado correctamente.");
        } else {
          const productRef = await addDoc(collection(db, "products"), {
            ...productData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          products = [{ ...productData, id: productRef.id }, ...products];
          showToast("Producto publicado en el catálogo.");
        }
        renderProducts();
        renderSellerDashboard();
        closeAddProductModal();
      } catch (error) {
        console.error("No se pudo guardar el producto:", error);
        showToast("No se pudo guardar el producto. Comprueba tu conexión y permisos.");
      }
    });
  }

  // Inicializar simulador de Términos y Condiciones
  initTermsSimulator({
    onAccept: () => {
      const chk = document.getElementById("cartAcceptTermsCheckbox");
      if (chk) chk.checked = true;
    }
  });

  document.getElementById("sidebarTermsSimBtn")?.addEventListener("click", () => {
    window.openTermsSimulator?.("sim");
  });
  document.getElementById("btnOpenTermsFromDropdown")?.addEventListener("click", () => {
    window.openTermsSimulator?.("sim");
  });
  document.getElementById("cartLinkTerms")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.openTermsSimulator?.("doc");
  });
  document.getElementById("cartBtnSecuritySim")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.openTermsSimulator?.("sim");
  });
  document.getElementById("btnMarkAllNotifsRead")?.addEventListener("click", () => {
    notifications = [];
    saveUserStorage("notifications", []);
    renderNotifications();
    showToast("Notificaciones limpiadas.");
  });

  // ================= MODAL SOPORTE Y MEDIACIÓN PAYNEX =================
  const supportModal = document.getElementById("paynexSupportModal");
  const supportForm = document.getElementById("paynexSupportForm");
  const btnCloseSupport = document.getElementById("btnCloseSupportModal");
  const btnCancelSupport = document.getElementById("btnCancelSupportModal");

  function renderOrderTickets(orderId) {
    const container = document.getElementById("supportTicketsListContainer");
    const itemsContainer = document.getElementById("supportTicketsItems");
    if (!container || !itemsContainer) return;

    const allTickets = readUserStorage("support_tickets", []);
    const orderTickets = allTickets.filter(t => t.orderId === orderId);

    if (!orderTickets.length) {
      container.style.display = "none";
      itemsContainer.innerHTML = "";
      return;
    }

    container.style.display = "block";
    itemsContainer.innerHTML = orderTickets.map(ticket => `
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: #4f46e5;">Caso #${escapeHTML(ticket.id || ticket.ticketNumber || 'SOP')}</strong>
          <span style="background: #ecfdf5; color: #047857; font-weight: 700; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
            ${escapeHTML(ticket.status || 'En mediación')}
          </span>
        </div>
        <div style="color: #334155; margin-bottom: 4px;"><strong>Motivo:</strong> ${escapeHTML(ticket.reason)}</div>
        <div style="color: #64748b; font-style: italic;">"${escapeHTML(ticket.message)}"</div>
        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 6px; display: flex; justify-content: space-between;">
          <span>Gestionado por: ${escapeHTML(ticket.paynexAgent || 'Equipo PayNex')}</span>
          <span>${orderDate(ticket.createdAt)}</span>
        </div>
      </div>
    `).join("");
  }

  window.openSupportModal = function(orderId) {
    if (!supportModal) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      showToast("No se encontró la información del pedido seleccionado.");
      return;
    }

    const badgeEl = document.getElementById("supportOrderBadge");
    const statusEl = document.getElementById("supportCurrentStatusBadge");
    const prodEl = document.getElementById("supportProductName");
    const provEl = document.getElementById("supportProviderName");
    const orderIdInput = document.getElementById("supportOrderId");
    const prodIdInput = document.getElementById("supportProductId");
    const sellerIdInput = document.getElementById("supportSellerId");
    const msgInput = document.getElementById("supportMessageInput");
    const reasonSelect = document.getElementById("supportReasonSelect");
    const prioritySelect = document.getElementById("supportPrioritySelect");
    const consentCheck = document.getElementById("supportConsentCheck");

    if (badgeEl) badgeEl.textContent = `Pedido #${order.id.slice(0, 8).toUpperCase()}`;
    if (statusEl) {
      statusEl.textContent = order.status || "En proceso";
      statusEl.className = `status-badge ${orderStatusClass(order.status)}`;
    }
    if (prodEl) prodEl.textContent = `${order.productName} × ${order.quantity}`;
    if (provEl) provEl.textContent = order.sellerName || "Proveedor Autorizado PayNex";
    if (orderIdInput) orderIdInput.value = order.id;
    if (prodIdInput) prodIdInput.value = order.productId || "";
    if (sellerIdInput) sellerIdInput.value = order.sellerId || "";
    if (msgInput) msgInput.value = "";
    if (reasonSelect) reasonSelect.selectedIndex = 0;
    if (prioritySelect) prioritySelect.selectedIndex = 0;
    if (consentCheck) consentCheck.checked = true;

    renderOrderTickets(order.id);

    supportModal.style.display = "flex";
    supportModal.classList.add("open");
  };

  window.closeSupportModal = function() {
    if (supportModal) {
      supportModal.style.display = "none";
      supportModal.classList.remove("open");
    }
  };

  if (btnCloseSupport) btnCloseSupport.addEventListener("click", window.closeSupportModal);
  if (btnCancelSupport) btnCancelSupport.addEventListener("click", window.closeSupportModal);
  if (supportModal) {
    supportModal.addEventListener("click", (e) => {
      if (e.target === supportModal) window.closeSupportModal();
    });
  }

  if (supportForm) {
    supportForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const orderId = document.getElementById("supportOrderId")?.value;
      const productId = document.getElementById("supportProductId")?.value;
      const sellerId = document.getElementById("supportSellerId")?.value;
      const reason = document.getElementById("supportReasonSelect")?.value;
      const priority = document.getElementById("supportPrioritySelect")?.value;
      const message = document.getElementById("supportMessageInput")?.value.trim();
      const consent = document.getElementById("supportConsentCheck")?.checked;

      if (!orderId) {
        showToast("Error: No se ha seleccionado un pedido válido.");
        return;
      }

      if (!message || message.length < 10) {
        showToast("Por favor describe tu inconformidad o requerimiento con al menos 10 caracteres.");
        return;
      }

      if (!consent) {
        showToast("Debes autorizar la intermediación de PayNex para gestionar tu caso.");
        return;
      }

      const order = orders.find(o => o.id === orderId);
      const buyerName = `${currentUserData?.firstName || ""} ${currentUserData?.lastName || ""}`.trim() || currentUser.displayName || currentUser.email;

      const ticketPayload = {
        orderId,
        buyerId: currentUser.uid,
        buyerName,
        buyerEmail: currentUser.email,
        sellerId: sellerId || order?.sellerId || "proveedor",
        sellerName: order?.sellerName || "Proveedor PayNex",
        productName: order?.productName || "Producto",
        reason,
        priority,
        message,
        status: "En mediación por PayNex",
        paynexAgent: "Departamento de Protección al Comprador PayNex",
        clientConsent: true,
        resolutionChannel: "Intermediación Oficial PayNex (Garantía de compra)"
      };

      const submitBtn = document.getElementById("btnSubmitSupportTicket");
      if (submitBtn) submitBtn.disabled = true;

      let savedInFirestore = false;
      let ticketRefId = null;

      try {
        const docRef = await addDoc(collection(db, "tickets"), {
          ...ticketPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        ticketRefId = docRef.id;
        savedInFirestore = true;
      } catch (err) {
        console.warn("Firestore rechazó ticket o permisos pendientes, guardando en contingencia:", err);
      }

      const ticketId = ticketRefId || ("TCK-" + Date.now().toString(36).toUpperCase());
      const localTicket = {
        id: ticketId,
        ticketNumber: ticketId.slice(0, 10),
        ...ticketPayload,
        createdAt: new Date().toISOString()
      };

      const existingTickets = readUserStorage("support_tickets", []);
      saveUserStorage("support_tickets", [localTicket, ...existingTickets]);

      // Notificación al comprador confirmando la intermediación de PayNex
      addNotification(
        `🛡️ Solicitud de Mediación Radicada #${ticketId.slice(0, 8)}`,
        `PayNex ha tomado el caso sobre tu pedido (${order?.productName || 'Producto'}). Gestionaremos la solución directamente con el proveedor sin que tengas que exponerte.`,
        orderId,
        order?.status || "En proceso"
      );

      if (submitBtn) submitBtn.disabled = false;
      window.closeSupportModal();
      showToast("✅ Solicitud recibida. PayNex gestionará tu inconformidad directamente con el proveedor.");
    });
  }
}

// ================= 10. BÚSQUEDA Y FILTRADO =================
function initSearch() {
  const searchInput = document.getElementById("topSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => filterProducts(searchInput.value));
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      filterProducts(searchInput.value);
    }
  });
  document.getElementById("btnTopSearch")?.addEventListener("click", () => filterProducts(searchInput.value));
}

function filterProducts(query) {
  renderProducts(query);
}

function initCategories() {
  const catCards = document.querySelectorAll(".category-card");
  catCards.forEach(card => {
    card.addEventListener("click", () => {
      catCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentCategoryFilter = card.getAttribute("data-category") || "all";
      renderProducts();
    });
  });
}

// ================= 11. PERFIL =================
function initProfile() {
  const form = document.getElementById("userProfileForm");
  const avatarInput = document.getElementById("avatarFileInput");
  if (avatarInput) avatarInput.disabled = true;

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentUser) return;
      const newName = document.getElementById("profileFullNameInput").value.trim();
      const [firstName, ...lastNameParts] = newName.split(/\s+/);
      const lastName = lastNameParts.join(" ");
      if (!firstName || firstName.length > 80 || lastName.length > 120 || newName.length > 200) {
        showToast("Usa un nombre de hasta 80 caracteres y un apellido de hasta 120.");
        return;
      }

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          firstName,
          lastName,
          updatedAt: serverTimestamp()
        });
        currentUserData = { ...currentUserData, firstName, lastName };
        const displayName = `${firstName} ${lastName}`.trim();
        document.getElementById("headerUserName").textContent = displayName;
        document.getElementById("profileDisplayName").textContent = displayName;
        showToast("Datos de perfil guardados.");
      } catch (error) {
        console.error("No se pudo actualizar el perfil:", error);
        showToast("No se pudieron guardar los datos del perfil.");
      }
    });
  }
}

// ================= 12. TOAST NOTIFICACIONES =================
window.showToast = function(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
