import { checkAuthState, logoutUser } from "./auth.js";
import { 
  db, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection, 
  addDoc, 
  getDocs,
  query,
  where
} from "./firebase-confi.js";

// ================= ESTADO GLOBAL =================
let currentUser = null;
let currentUserData = null;
let products = [];
let cart = [];
let favorites = [];
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
  }, error => {
    console.error("No se pudo verificar el perfil para el panel:", error);
    window.location.replace("login.html?profileError=1");
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
    btnCheckout.addEventListener("click", () => {
      showToast("Las compras están deshabilitadas hasta integrar un proveedor de pagos seguro.");
    });
  }
}

// ================= 6. VISTA COMPRADOR: MIS COMPRAS =================
function renderBuyerOrders() {
  const tbody = document.getElementById("buyerOrdersTableBody");
  const countEl = document.getElementById("buyerTotalPurchasesCount");
  const inTransitEl = document.getElementById("buyerInTransitCount");
  const deliveredEl = document.getElementById("buyerDeliveredCount");

  if (countEl) countEl.textContent = "No disponible";
  if (inTransitEl) inTransitEl.textContent = "No disponible";
  if (deliveredEl) deliveredEl.textContent = "No disponible";

  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">El historial de compras no está disponible hasta integrar pedidos y pagos verificados.</td></tr>`;
}

// ================= 7. VISTA VENDEDOR: MIS VENTAS & FINANZAS =================
function renderSellerDashboard() {
  const totalSalesEl = document.getElementById("kpiTotalSales");
  const activeProductsEl = document.getElementById("kpiActiveProducts");
  const balanceEl = document.getElementById("kpiAvailableBalance");
  const financeBalanceEl = document.getElementById("financeBalanceAmount");

  const ownProducts = currentUser ? products.filter(product => product.sellerId === currentUser.uid) : [];
  if (totalSalesEl) totalSalesEl.textContent = "No disponible";
  if (activeProductsEl) activeProductsEl.textContent = ownProducts.length;
  if (balanceEl) balanceEl.textContent = "No disponible";
  if (financeBalanceEl) financeBalanceEl.textContent = "No disponible";

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
    ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No hay pedidos confirmados.</td></tr>`;
  }

  const txList = document.getElementById("transactionsListWrap");
  if (txList) {
    txList.innerHTML = `<p style="color:var(--text-muted);">Los pagos y movimientos aún no están habilitados.</p>`;
  }
}

window.updateSellerOrderStatus = function(orderId, newStatus) {
  console.warn("No se pueden actualizar pedidos: el flujo de pedidos todavía no está habilitado.", orderId, newStatus);
  showToast("La gestión de pedidos aún no está habilitada.");
};

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

  form.addEventListener("submit", e => {
    e.preventDefault();
    showToast("Los retiros no están habilitados: falta integrar un procesador de pagos y validación del servidor.");
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
