import { checkAuthState, logoutUser } from "./auth.js";
import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection, 
  addDoc, 
  getDocs 
} from "./firebase-confi.js";

// ================= PRODUCTOS POR DEFECTO (Mockup 2) =================
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "iPhone 15 Pro",
    category: "Tecnología",
    price: 1250000,
    rating: 4.8,
    reviews: 124,
    badge: "Más vendido",
    image: "img/p_iphone_hq.png",
    stock: 12,
    status: "Activo",
    sellerName: "Santiago G."
  },
  {
    id: 2,
    name: "Tenis deportivos",
    category: "Moda",
    price: 180000,
    rating: 4.7,
    reviews: 98,
    badge: null,
    image: "img/p_tenis_hq.png",
    stock: 25,
    status: "Activo",
    sellerName: "Santiago G."
  },
  {
    id: 3,
    name: "Smartwatch Serie 8",
    category: "Tecnología",
    price: 250000,
    rating: 4.6,
    reviews: 87,
    badge: null,
    image: "img/p_smartwatch_hq.png",
    stock: 15,
    status: "Activo",
    sellerName: "Santiago G."
  },
  {
    id: 4,
    name: "Perfume L'Essence",
    category: "Belleza",
    price: 135000,
    rating: 4.9,
    reviews: 210,
    badge: null,
    image: "img/p_perfume_hq.png",
    stock: 30,
    status: "Activo",
    sellerName: "Santiago G."
  },
  {
    id: 5,
    name: "Morral urbano",
    category: "Accesorios",
    price: 90000,
    rating: 4.7,
    reviews: 64,
    badge: null,
    image: "img/p_morral_hq.png",
    stock: 18,
    status: "Activo",
    sellerName: "Santiago G."
  }
];

// Compras iniciales del usuario como comprador (Mis compras)
const INITIAL_BUYER_ORDERS = [
  {
    id: "ORD-9428",
    productName: "Audífonos inalámbricos",
    productImage: "img/mockup2_banner_3d_2x.png",
    sellerName: "AudioStore Colombia",
    amount: 120000,
    date: "14 Sep 2026",
    status: "Enviado"
  },
  {
    id: "ORD-7612",
    productName: "Tenis deportivos",
    productImage: "img/p_tenis_hq.png",
    sellerName: "Urban Style",
    amount: 180000,
    date: "08 Sep 2026",
    status: "Entregado"
  },
  {
    id: "ORD-5190",
    productName: "Gorra Streetwear",
    productImage: "img/p_morral_hq.png",
    sellerName: "CapZone",
    amount: 55000,
    date: "02 Sep 2026",
    status: "Entregado"
  }
];

// Pedidos recibidos como vendedor (Mis ventas)
const INITIAL_SELLER_ORDERS = [
  {
    id: "ORD-849201",
    productName: "iPhone 15 Pro",
    buyerName: "Carlos Ruiz",
    amount: 1250000,
    date: "Hoy, 10:30 AM",
    status: "Pendiente"
  },
  {
    id: "ORD-719302",
    productName: "Smartwatch Serie 8",
    buyerName: "Laura Herrera",
    amount: 250000,
    date: "Ayer, 04:15 PM",
    status: "Enviado"
  }
];

// Movimientos financieros iniciales
const INITIAL_TRANSACTIONS = [
  { id: 1, type: "income", title: "Venta: iPhone 15 Pro", date: "Hoy, 10:30 AM", amount: 1250000 },
  { id: 2, type: "withdraw", title: "Retiro a Nequi (312***4567)", date: "12 Sep 2026", amount: -150000 },
  { id: 3, type: "income", title: "Venta: Smartwatch Serie 8", date: "10 Sep 2026", amount: 250000 }
];

// ================= ESTADO GLOBAL =================
let currentUser = null;
let products = JSON.parse(localStorage.getItem("paynex_products")) || DEFAULT_PRODUCTS;
let cart = JSON.parse(localStorage.getItem("paynex_cart")) || [
  { id: 2, quantity: 1 },
  { id: 5, quantity: 1 }
];
let favorites = JSON.parse(localStorage.getItem("paynex_favorites")) || [1];
let buyerOrders = JSON.parse(localStorage.getItem("paynex_buyer_orders")) || INITIAL_BUYER_ORDERS;
let sellerOrders = JSON.parse(localStorage.getItem("paynex_seller_orders")) || INITIAL_SELLER_ORDERS;
let transactions = JSON.parse(localStorage.getItem("paynex_transactions")) || INITIAL_TRANSACTIONS;
let availableBalance = parseFloat(localStorage.getItem("paynex_balance")) || 320000;
let currentCategoryFilter = "all";

// ================= INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initNavigation();
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
    if (user) {
      currentUser = user;
      const firstName = userData?.firstName || (user.displayName ? user.displayName.split(" ")[0] : null) || user.email?.split("@")[0] || "Santiago";
      const lastName = userData?.lastName || (user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "") || "G.";
      const fullName = `${firstName} ${lastName}`.trim();
      const photo = localStorage.getItem(`paynex_avatar_${user.email}`) || userData?.photoURL || user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face";

      const headerUserName = document.getElementById("headerUserName");
      const headerUserAvatar = document.getElementById("headerUserAvatar");
      const profileDisplayName = document.getElementById("profileDisplayName");
      const profileUserAvatar = document.getElementById("profileUserAvatar");
      const profileFullNameInput = document.getElementById("profileFullNameInput");
      const profileEmailInput = document.getElementById("profileEmailInput");

      if (headerUserName) headerUserName.textContent = fullName;
      if (headerUserAvatar) headerUserAvatar.src = photo;
      if (profileDisplayName) profileDisplayName.textContent = fullName;
      if (profileUserAvatar) profileUserAvatar.src = photo;
      if (profileFullNameInput) profileFullNameInput.value = fullName;
      if (profileEmailInput) profileEmailInput.value = user.email || "";
    }
  });

  // Cerrar sesión
  const btnLogout = document.getElementById("btnLogoutSession");
  const btnConfigLogout = document.getElementById("btnConfigLogout");
  const handleLogout = (e) => {
    e.preventDefault();
    logoutUser().then(() => {
      window.location.href = "Index.html";
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

  // Marcar notificaciones como leídas
  const btnMarkNotifs = document.getElementById("btnMarkAllNotifsRead");
  const notifBadge = document.getElementById("headerNotifBadge");
  if (btnMarkNotifs) {
    btnMarkNotifs.addEventListener("click", () => {
      if (notifBadge) notifBadge.style.display = "none";
      showToast("Notificaciones marcadas como leídas");
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

function switchSellerSubView(subviewId) {
  document.querySelectorAll(".seller-tab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-subview") === subviewId);
  });
  document.querySelectorAll(".seller-subview").forEach(v => {
    v.classList.toggle("active", v.id === `subview-${subviewId}`);
  });
}

// ================= 3. RENDERIZADO DE PRODUCTOS (Mockup 2) =================
function renderProducts() {
  const featuredGrid = document.getElementById("featuredProductsGrid");
  const catalogGrid = document.getElementById("allProductsCatalogGrid");

  let filtered = products;
  if (currentCategoryFilter !== "all") {
    filtered = products.filter(p => p.category.toLowerCase() === currentCategoryFilter.toLowerCase());
  }

  const html = filtered.map(prod => {
    const isFav = favorites.includes(prod.id);
    const formattedPrice = `$ ${Number(prod.price).toLocaleString("es-CO")}`;
    const badgeHtml = prod.badge ? `<span class="product-badge-pill">${prod.badge}</span>` : "";

    return `
      <div class="product-item-card" data-product-id="${prod.id}">
        ${badgeHtml}
        <button type="button" class="btn-fav-heart ${isFav ? 'active' : ''}" onclick="window.toggleFavorite(${prod.id})" title="Añadir a favoritos">
          <svg width="16" height="16" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>

        <div class="product-img-wrap">
          <img src="${prod.image}" alt="${prod.name}">
        </div>

        <div class="product-info-wrap">
          <div class="product-item-title" title="${prod.name}">${prod.name}</div>
          <div class="product-rating">
            <span class="star">★</span>
            <span class="score">${prod.rating || 4.8}</span>
            <span class="reviews">(${prod.reviews || 85})</span>
          </div>
          <div class="product-price">${formattedPrice}</div>
        </div>

        <button type="button" class="btn-add-cart" onclick="window.addToCart(${prod.id})">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
          <span>Agregar al carrito</span>
        </button>
      </div>
    `;
  }).join("");

  if (featuredGrid) featuredGrid.innerHTML = html;
  if (catalogGrid) catalogGrid.innerHTML = html;
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

  localStorage.setItem("paynex_favorites", JSON.stringify(favorites));
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
        <button type="button" class="btn-primary-action" onclick="window.switchView('inicio')">Explorar productos</button>
      </div>
    `;
    return;
  }

  favGrid.innerHTML = favProducts.map(prod => `
    <div class="product-item-card">
      <button type="button" class="btn-fav-heart active" onclick="window.toggleFavorite(${prod.id})" title="Quitar de favoritos">
        <svg width="16" height="16" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </button>

      <div class="product-img-wrap">
        <img src="${prod.image}" alt="${prod.name}">
      </div>

      <div class="product-info-wrap">
        <div class="product-item-title">${prod.name}</div>
        <div class="product-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
      </div>

      <button type="button" class="btn-add-cart" onclick="window.addToCart(${prod.id})">
        <span>Agregar al carrito</span>
      </button>
    </div>
  `).join("");
}

// ================= 5. CARRITO DE COMPRAS =================
window.addToCart = function(productId) {
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  localStorage.setItem("paynex_cart", JSON.stringify(cart));
  renderCart();

  const prod = products.find(p => p.id === productId);
  showToast(`🛍️ ${prod ? prod.name : 'Producto'} añadido al carrito`);
  openCartDrawer();
};

window.updateCartQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }

  localStorage.setItem("paynex_cart", JSON.stringify(cart));
  renderCart();
};

window.removeFromCart = function(productId) {
  cart = cart.filter(i => i.id !== productId);
  localStorage.setItem("paynex_cart", JSON.stringify(cart));
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
    const prod = products.find(p => p.id === item.id) || {
      id: item.id,
      name: "Producto PayNex",
      price: 100000,
      image: "img/p_iphone_hq.png"
    };

    const itemTotal = prod.price * item.quantity;
    totalAmount += itemTotal;

    return `
      <div class="cart-item-row">
        <div class="cart-item-thumb">
          <img src="${prod.image}" alt="${prod.name}">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${prod.name}</div>
          <div class="cart-item-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
          <div class="cart-qty-ctrl">
            <button type="button" class="btn-qty" onclick="window.updateCartQty(${prod.id}, -1)">-</button>
            <span style="font-size: 13px; font-weight: 700; min-width: 18px; text-align: center;">${item.quantity}</span>
            <button type="button" class="btn-qty" onclick="window.updateCartQty(${prod.id}, 1)">+</button>
          </div>
        </div>
        <button type="button" class="btn-remove-cart" onclick="window.removeFromCart(${prod.id})" title="Eliminar">🗑️</button>
      </div>
    `;
  }).join("");

  if (container) container.innerHTML = itemsHtml;
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
      if (cart.length === 0) {
        showToast("Tu carrito está vacío");
        return;
      }

      // Procesar compra: añadir a Mis compras
      cart.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          const newOrder = {
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            productName: prod.name,
            productImage: prod.image,
            sellerName: prod.sellerName || "Vendedor PayNex",
            amount: prod.price * item.quantity,
            date: "Hoy",
            status: "Enviado"
          };
          buyerOrders.unshift(newOrder);

          // También registrar como venta recibida
          sellerOrders.unshift({
            id: newOrder.id,
            productName: prod.name,
            buyerName: currentUser?.displayName || "Santiago G.",
            amount: newOrder.amount,
            date: "Hoy",
            status: "Pendiente"
          });
        }
      });

      // Limpiar carrito
      cart = [];
      localStorage.setItem("paynex_cart", JSON.stringify(cart));
      localStorage.setItem("paynex_buyer_orders", JSON.stringify(buyerOrders));
      localStorage.setItem("paynex_seller_orders", JSON.stringify(sellerOrders));

      renderCart();
      renderBuyerOrders();
      renderSellerDashboard();
      closeCartDrawer();

      showToast("🎉 ¡Compra realizada con éxito! Revisa 'Mis compras'.");
      switchView("mis-compras");
    });
  }
}

// ================= 6. VISTA COMPRADOR: MIS COMPRAS =================
function renderBuyerOrders() {
  const tbody = document.getElementById("buyerOrdersTableBody");
  const countEl = document.getElementById("buyerTotalPurchasesCount");
  const inTransitEl = document.getElementById("buyerInTransitCount");
  const deliveredEl = document.getElementById("buyerDeliveredCount");

  if (countEl) countEl.textContent = buyerOrders.length;
  if (inTransitEl) inTransitEl.textContent = buyerOrders.filter(o => o.status === "Enviado" || o.status === "Pendiente").length;
  if (deliveredEl) deliveredEl.textContent = buyerOrders.filter(o => o.status === "Entregado").length;

  if (!tbody) return;

  if (buyerOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No has realizado compras aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = buyerOrders.map(order => {
    let statusClass = "pending";
    if (order.status === "Enviado") statusClass = "sent";
    if (order.status === "Entregado") statusClass = "delivered";

    return `
      <tr>
        <td><strong>#${order.id}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${order.productImage}" style="width: 36px; height: 36px; object-fit: contain; border-radius: 8px; background: #f8fafc;">
            <span>${order.productName}</span>
          </div>
        </td>
        <td>${order.sellerName}</td>
        <td><strong>$ ${Number(order.amount).toLocaleString("es-CO")}</strong></td>
        <td>${order.date}</td>
        <td><span class="status-badge ${statusClass}">${order.status}</span></td>
        <td>
          <button type="button" class="btn-primary-action" style="padding: 6px 12px; font-size: 11px;" onclick="window.showToast('Seguimiento activo: En camino a tu dirección')">
            Rastrear 🚚
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Botón simular compra
  const btnSimulate = document.getElementById("btnSimulatePurchase");
  if (btnSimulate) {
    btnSimulate.onclick = () => {
      const sample = products[Math.floor(Math.random() * products.length)];
      buyerOrders.unshift({
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: sample.name,
        productImage: sample.image,
        sellerName: "Emprendedor PayNex",
        amount: sample.price,
        date: "Hoy",
        status: "Enviado"
      });
      localStorage.setItem("paynex_buyer_orders", JSON.stringify(buyerOrders));
      renderBuyerOrders();
      showToast(`🛍️ Compra simulada: ${sample.name}`);
    };
  }
}

// ================= 7. VISTA VENDEDOR: MIS VENTAS & FINANZAS =================
function renderSellerDashboard() {
  // KPIs
  const totalSalesEl = document.getElementById("kpiTotalSales");
  const activeProductsEl = document.getElementById("kpiActiveProducts");
  const balanceEl = document.getElementById("kpiAvailableBalance");
  const financeBalanceEl = document.getElementById("financeBalanceAmount");

  if (activeProductsEl) activeProductsEl.textContent = products.length;
  if (balanceEl) balanceEl.textContent = `$ ${Number(availableBalance).toLocaleString("es-CO")}`;
  if (financeBalanceEl) financeBalanceEl.textContent = `$ ${Number(availableBalance).toLocaleString("es-CO")} COP`;

  // Tabla Mis Productos
  const prodTbody = document.getElementById("sellerProductsTableBody");
  if (prodTbody) {
    prodTbody.innerHTML = products.map(prod => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${prod.image}" style="width: 36px; height: 36px; object-fit: contain; border-radius: 8px;">
            <strong>${prod.name}</strong>
          </div>
        </td>
        <td>${prod.category}</td>
        <td>$ ${Number(prod.price).toLocaleString("es-CO")}</td>
        <td>${prod.stock} un.</td>
        <td><span class="status-badge delivered">Activo</span></td>
        <td>
          <button type="button" style="background:none; border:none; cursor:pointer; margin-right:8px;" onclick="window.editProduct(${prod.id})" title="Editar">✏️</button>
          <button type="button" style="background:none; border:none; cursor:pointer; color:#ef4444;" onclick="window.deleteProduct(${prod.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join("");
  }

  // Tabla Pedidos Recibidos
  const ordersTbody = document.getElementById("sellerReceivedOrdersTableBody");
  if (ordersTbody) {
    ordersTbody.innerHTML = sellerOrders.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${o.productName}</td>
        <td>${o.buyerName}</td>
        <td><strong>$ ${Number(o.amount).toLocaleString("es-CO")}</strong></td>
        <td>${o.date}</td>
        <td><span class="status-badge sent">${o.status}</span></td>
        <td>
          <select style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px;" onchange="window.updateSellerOrderStatus('${o.id}', this.value)">
            <option value="Pendiente" ${o.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="Enviado" ${o.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
            <option value="Entregado" ${o.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
          </select>
        </td>
      </tr>
    `).join("");
  }

  // Historial de Movimientos Financieros
  const txList = document.getElementById("transactionsListWrap");
  if (txList) {
    txList.innerHTML = transactions.map(tx => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${tx.amount > 0 ? '#10b981' : '#ef4444'};">
        <div>
          <strong style="font-size: 13.5px;">${tx.title}</strong>
          <div style="font-size: 12px; color: var(--text-muted);">${tx.date}</div>
        </div>
        <strong style="color: ${tx.amount > 0 ? '#10b981' : '#ef4444'}; font-size: 14px;">
          ${tx.amount > 0 ? '+' : ''}$ ${Number(tx.amount).toLocaleString("es-CO")}
        </strong>
      </div>
    `).join("");
  }
}

window.updateSellerOrderStatus = function(orderId, newStatus) {
  const o = sellerOrders.find(item => item.id === orderId);
  if (o) {
    o.status = newStatus;
    localStorage.setItem("paynex_seller_orders", JSON.stringify(sellerOrders));
    showToast(`Pedido #${orderId} actualizado a: ${newStatus}`);
  }
};

window.deleteProduct = function(prodId) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
    products = products.filter(p => p.id !== prodId);
    localStorage.setItem("paynex_products", JSON.stringify(products));
    renderProducts();
    renderSellerDashboard();
    showToast("Producto eliminado");
  }
};

// ================= 8. FORMULARIO DE FINANZAS Y RETIROS =================
function initWithdrawForm() {
  const form = document.getElementById("financeWithdrawForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const method = document.getElementById("withdrawMethodSelect").value;
    const account = document.getElementById("withdrawAccountInput").value;
    const amount = parseFloat(document.getElementById("withdrawAmountInput").value);

    if (amount > availableBalance) {
      alert("El monto ingresado supera tu saldo disponible.");
      return;
    }

    availableBalance -= amount;
    transactions.unshift({
      id: Date.now(),
      type: "withdraw",
      title: `Retiro a ${method.toUpperCase()} (${account})`,
      date: "Hoy",
      amount: -amount
    });

    localStorage.setItem("paynex_balance", availableBalance.toString());
    localStorage.setItem("paynex_transactions", JSON.stringify(transactions));

    renderSellerDashboard();
    form.reset();
    showToast(`💸 Solicitud de retiro por $${Number(amount).toLocaleString("es-CO")} procesada con éxito.`);
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
    const prod = products.find(p => p.id === id);
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
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const editId = document.getElementById("prodEditId").value;
      const title = document.getElementById("prodTitleInput").value;
      const category = document.getElementById("prodCategorySelect").value;
      const price = parseFloat(document.getElementById("prodPriceInput").value);
      const stock = parseInt(document.getElementById("prodStockInput").value, 10);
      const image = document.getElementById("prodImageInput").value || "img/p_iphone_hq.png";

      if (editId) {
        const p = products.find(prod => prod.id == editId);
        if (p) {
          p.name = title;
          p.category = category;
          p.price = price;
          p.stock = stock;
          p.image = image;
        }
        showToast("Producto actualizado correctamente");
      } else {
        const newProduct = {
          id: Date.now(),
          name: title,
          category: category,
          price: price,
          stock: stock,
          image: image,
          rating: 5.0,
          reviews: 1,
          badge: "Nuevo",
          status: "Activo",
          sellerName: currentUser?.displayName || "Santiago G."
        };
        products.unshift(newProduct);
        showToast("🎉 ¡Producto publicado en el catálogo!");
      }

      localStorage.setItem("paynex_products", JSON.stringify(products));
      renderProducts();
      renderSellerDashboard();
      closeAddProductModal();
    });
  }
}

// ================= 10. BÚSQUEDA Y FILTRADO =================
function initSearch() {
  const searchInput = document.getElementById("topSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    filterProducts(e.target.value);
  });
}

function filterProducts(query) {
  const term = query.toLowerCase().trim();
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(term) || 
    p.category.toLowerCase().includes(term)
  );

  const featuredGrid = document.getElementById("featuredProductsGrid");
  const catalogGrid = document.getElementById("allProductsCatalogGrid");

  if (!featuredGrid && !catalogGrid) return;

  const html = filtered.map(prod => `
    <div class="product-item-card">
      <button type="button" class="btn-fav-heart ${favorites.includes(prod.id) ? 'active' : ''}" onclick="window.toggleFavorite(${prod.id})">
        <svg width="16" height="16" fill="${favorites.includes(prod.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </button>
      <div class="product-img-wrap"><img src="${prod.image}" alt="${prod.name}"></div>
      <div class="product-info-wrap">
        <div class="product-item-title">${prod.name}</div>
        <div class="product-price">$ ${Number(prod.price).toLocaleString("es-CO")}</div>
      </div>
      <button type="button" class="btn-add-cart" onclick="window.addToCart(${prod.id})">
        <span>Agregar al carrito</span>
      </button>
    </div>
  `).join("");

  if (featuredGrid) featuredGrid.innerHTML = html.length ? html : `<p style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">No se encontraron productos para "${query}"</p>`;
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

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const photoUrl = re.target.result;
          document.getElementById("profileUserAvatar").src = photoUrl;
          document.getElementById("headerUserAvatar").src = photoUrl;
          if (currentUser) {
            localStorage.setItem(`paynex_avatar_${currentUser.email}`, photoUrl);
          }
          showToast("Foto de perfil actualizada");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const newName = document.getElementById("profileFullNameInput").value;
      document.getElementById("headerUserName").textContent = newName;
      document.getElementById("profileDisplayName").textContent = newName;
      showToast("Datos de perfil guardados");
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
