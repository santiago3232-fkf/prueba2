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
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  limit
} from "./firebase-confi.js";

// ================= DATOS INICIALES POR DEFECTO =================
const INITIAL_PRODUCTS = [
  { id: 1, name: "Camiseta Oversize", category: "Ropa & Moda", price: 85000, stock: 15, status: "Activo", image: "img/login_panel.png", sellerId: "seller_default", sellerName: "Valentina Gómez" },
  { id: 2, name: "Gorra Béisbol Streetwear", category: "Accesorios", price: 55000, stock: 8, status: "Activo", image: "img/register_panel.png", sellerId: "seller_default", sellerName: "Valentina Gómez" },
  { id: 3, name: "Tenis Personalizados VR", category: "Calzado", price: 210000, stock: 5, status: "Activo", image: "img/register_illustration.png", sellerId: "seller_default", sellerName: "Valentina Gómez" },
  { id: 4, name: "Visor VR Headset Pro", category: "Tecnología", price: 320000, stock: 3, status: "Activo", image: "img/login_illustration.png", sellerId: "seller_default", sellerName: "Valentina Gómez" }
];

const INITIAL_TRANSACTIONS = [
  { id: 101, type: "income", title: "Venta: Camiseta Oversize", date: "Hoy, 02:45 PM", amount: 85000 },
  { id: 102, type: "income", title: "Venta: Gorra Béisbol Streetwear", date: "Ayer, 06:12 PM", amount: 55000 },
  { id: 103, type: "withdraw", title: "Retiro a Nequi (312***4567)", date: "28 Ago 2026", amount: -150000 },
  { id: 104, type: "income", title: "Venta: Tenis Personalizados", date: "25 Ago 2026", amount: 210000 }
];

const INITIAL_ORDERS = [
  { 
    id: "ORD-849201", 
    productId: 1, 
    productName: "Camiseta Oversize", 
    productImage: "img/login_panel.png",
    buyerId: "buyer_carlos", 
    buyerName: "Carlos Ruiz", 
    buyerEmail: "carlos@correo.com",
    sellerId: "seller_default", 
    sellerName: "Valentina Gómez",
    sellerEmail: "valentina@correo.com",
    price: 85000, 
    quantity: 1, 
    totalAmount: 85000, 
    status: "Pendiente", 
    createdAt: Date.now() - 3600000 
  },
  { 
    id: "ORD-719302", 
    productId: 2, 
    productName: "Gorra Béisbol Streetwear", 
    productImage: "img/register_panel.png",
    buyerId: "buyer_laura", 
    buyerName: "Laura Herrera", 
    buyerEmail: "laura@correo.com",
    sellerId: "seller_default", 
    sellerName: "Valentina Gómez",
    sellerEmail: "valentina@correo.com",
    price: 55000, 
    quantity: 1, 
    totalAmount: 55000, 
    status: "Enviado", 
    createdAt: Date.now() - 86400000 
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif_welcome",
    userId: "all",
    type: "sale",
    title: "🎉 ¡Bienvenido a PayNex!",
    message: "Tu panel de vendedor y comprador está activo con base de datos en tiempo real.",
    read: false,
    createdAt: Date.now() - 7200000
  }
];

// ================= ESTADO GLOBAL =================
let currentUser = null;
let userProducts = JSON.parse(localStorage.getItem("paynex_products")) || INITIAL_PRODUCTS;
let userTransactions = JSON.parse(localStorage.getItem("paynex_transactions")) || INITIAL_TRANSACTIONS;
let userOrders = JSON.parse(localStorage.getItem("paynex_orders")) || INITIAL_ORDERS;
let userNotifications = JSON.parse(localStorage.getItem("paynex_notifications")) || INITIAL_NOTIFICATIONS;
let availableBalance = parseFloat(localStorage.getItem("paynex_balance")) || 320000;

let currentChatContact = null;
let unsubscribeMessagesListener = null;
let unsubscribeNotifListener = null;

// ================= INICIALIZACIÓN PRINCIPAL =================
document.addEventListener("DOMContentLoaded", () => {
  initAuthState();
  initNavigation();
  renderDashboard();
  renderProductsTable();
  renderFinances();
  initProductModal();
  initWithdrawForm();
  initProfileForm();
  initAvatarUpload();
  initNotifications();
  initOrders();
  initPurchaseModal();
  initMessages();
});

// ================= 1. AUTENTICACIÓN Y USUARIO =================
function initAuthState() {
  checkAuthState((user, userData) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const savedAvatar = localStorage.getItem(`paynex_avatar_${user.email}`);

    currentUser = {
      ...user,
      ...userData,
      uid: user.uid || `user_${Date.now()}`,
      firstName: userData?.firstName || "Valentina",
      lastName: userData?.lastName || "Gómez",
      email: user.email || "valentina@correo.com",
      role: userData?.role || "vendedor",
      username: userData?.username || "@valengomez",
      photoURL: savedAvatar || userData?.photoURL || user.photoURL || "img/register_panel.png"
    };

    updateUIWithUser(currentUser);
    listenToNotifications();
    loadUsersForChat();
  });

  const btnLogout = document.getElementById("btnLogoutSidebar");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => logoutUser());
  }
}

function updateUIWithUser(user) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const avatarUrl = user.photoURL || "img/register_panel.png";
  
  // Header
  const headerGreeting = document.getElementById("headerGreeting");
  if (headerGreeting) headerGreeting.textContent = `¡Hola, ${user.firstName || 'Usuario'}! 👋`;

  const topAvatar = document.getElementById("topUserAvatar");
  if (topAvatar) topAvatar.src = avatarUrl;

  const topName = document.getElementById("topUserName");
  if (topName) topName.textContent = fullName;

  const topRole = document.getElementById("topUserRole");
  if (topRole) topRole.textContent = (user.role || "vendedor").toUpperCase();

  // Perfil
  const profileAvatar = document.getElementById("profileAvatarImg");
  if (profileAvatar) profileAvatar.src = avatarUrl;

  const profileNameInput = document.getElementById("profileFullName");
  if (profileNameInput) profileNameInput.value = fullName;

  const profileEmailInput = document.getElementById("profileEmail");
  if (profileEmailInput) profileEmailInput.value = user.email;

  const profileUsernameInput = document.getElementById("profileUsername");
  if (profileUsernameInput) profileUsernameInput.value = user.username || `@${(user.firstName || 'usuario').toLowerCase()}`;

  const profileRoleInput = document.getElementById("profileRole");
  if (profileRoleInput) profileRoleInput.value = user.role;
}

// ================= 2. NAVEGACIÓN SPA =================
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const viewSections = document.querySelectorAll(".view-section");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetView = item.getAttribute("data-view");

      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      viewSections.forEach(sec => {
        sec.classList.remove("active");
        if (sec.id === `view-${targetView}`) {
          sec.classList.add("active");
        }
      });
    });
  });

  // Enlaces rápidos
  const quickLinks = document.querySelectorAll("[data-navigate]");
  quickLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("data-navigate");
      const navItem = document.querySelector(`.nav-item[data-view="${target}"]`);
      if (navItem) navItem.click();
    });
  });
}

// ================= 3. FOTO DE PERFIL (CAMBIAR Y PERSISTIR EN BASE DE DATOS) =================
function initAvatarUpload() {
  const fileInput = document.getElementById("avatarFileInput");
  const triggerBtn = document.getElementById("btnTriggerAvatarFile");
  const avatarImg = document.getElementById("profileAvatarImg");
  const statusEl = document.getElementById("avatarUploadStatus");

  if (triggerBtn && fileInput) {
    triggerBtn.addEventListener("click", () => fileInput.click());
  }

  if (avatarImg && fileInput) {
    avatarImg.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).");
        return;
      }

      if (statusEl) {
        statusEl.style.color = "#6366f1";
        statusEl.textContent = "Procesando imagen...";
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target.result;
        
        // Optimizar y redimensionar con Canvas a 250px máx
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          // Actualizar inmediatamente en el DOM
          if (avatarImg) avatarImg.src = optimizedDataUrl;
          const topAvatar = document.getElementById("topUserAvatar");
          if (topAvatar) topAvatar.src = optimizedDataUrl;

          // Actualizar usuario en sesión
          currentUser.photoURL = optimizedDataUrl;
          sessionStorage.setItem("paynex_temp_user", JSON.stringify(currentUser));
          localStorage.setItem(`paynex_avatar_${currentUser.email}`, optimizedDataUrl);

          // Guardar en Firestore doc 'users/{uid}'
          try {
            if (currentUser.uid && !currentUser.isTemp) {
              await setDoc(doc(db, "users", currentUser.uid), { photoURL: optimizedDataUrl }, { merge: true });
            }
          } catch (fsErr) {
            console.warn("Firestore no disponible directamente, guardado en almacenamiento local:", fsErr);
          }

          if (statusEl) {
            statusEl.style.color = "#10b981";
            statusEl.textContent = "¡Foto de perfil actualizada y guardada con éxito! ✅";
            setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 4500);
          }
          showToast("Foto de Perfil", "Tu foto ha sido actualizada en la base de datos.", "sale");
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }
}

// ================= 4. SISTEMA DE NOTIFICACIONES EN TIEMPO REAL =================
function initNotifications() {
  const btnNotifications = document.getElementById("btnNotifications");
  const dropdown = document.getElementById("notificationsDropdown");
  const btnMarkAllRead = document.getElementById("btnMarkAllRead");

  if (btnNotifications && dropdown) {
    btnNotifications.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !btnNotifications.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  }

  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener("click", () => {
      userNotifications = userNotifications.map(n => ({ ...n, read: true }));
      localStorage.setItem("paynex_notifications", JSON.stringify(userNotifications));
      renderNotifications();
    });
  }

  renderNotifications();
}

function listenToNotifications() {
  try {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30));
    unsubscribeNotifListener = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length > 0) {
        userNotifications = list;
        localStorage.setItem("paynex_notifications", JSON.stringify(userNotifications));
      }
      renderNotifications();
    }, (err) => {
      console.warn("Firestore notificaciones en modo offline:", err);
      renderNotifications();
    });
  } catch (err) {
    console.warn("Error suscribiendo a notificaciones:", err);
    renderNotifications();
  }
}

export async function createNotification({ userId, type, title, message, orderId = null }) {
  const notif = {
    userId: userId || "all",
    type: type || "purchase", // 'purchase', 'sale', 'order_status'
    title: title,
    message: message,
    orderId: orderId,
    read: false,
    createdAt: Date.now()
  };

  // Guardar en Firestore
  try {
    const docRef = await addDoc(collection(db, "notifications"), notif);
    notif.id = docRef.id;
  } catch (err) {
    console.warn("Guardando notificación en local:", err);
    notif.id = "notif_" + Date.now();
  }

  // Guardar en almacenamiento local
  userNotifications.unshift(notif);
  localStorage.setItem("paynex_notifications", JSON.stringify(userNotifications));

  // Mostrar alerta Toast flotante en pantalla si es para el usuario actual o general
  showToast(title, message, type);
  renderNotifications();
}

function renderNotifications() {
  const badge = document.getElementById("notificationBadge");
  const unreadBadge = document.getElementById("notifUnreadBadge");
  const listEl = document.getElementById("notificationsList");

  if (!listEl) return;

  // Filtrar notificaciones para este usuario o 'all'
  const filtered = userNotifications.filter(n => 
    !currentUser || n.userId === "all" || n.userId === currentUser.uid || n.userId === currentUser.email ||
    (currentUser.role === "vendedor" && n.type === "sale") ||
    (currentUser.role === "cliente" && (n.type === "purchase" || n.type === "order_status"))
  );

  const unreadCount = filtered.filter(n => !n.read).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  if (unreadBadge) {
    unreadBadge.textContent = `${unreadCount} nuevas`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="notif-empty-state">No tienes notificaciones por el momento.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(notif => {
    let icon = "🛒";
    let iconClass = "purchase";
    if (notif.type === "sale") { icon = "🎉"; iconClass = "sale"; }
    else if (notif.type === "order_status") { icon = "📦"; iconClass = "status"; }

    const timeStr = formatRelativeTime(notif.createdAt);

    return `
      <div class="notif-item ${notif.read ? '' : 'unread'}" onclick="markNotificationRead('${notif.id}')">
        <div class="notif-icon-badge ${iconClass}">${icon}</div>
        <div class="notif-content">
          <div class="notif-title">${notif.title}</div>
          <div class="notif-desc">${notif.message}</div>
          <div class="notif-time">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

window.markNotificationRead = function(notifId) {
  userNotifications = userNotifications.map(n => n.id === notifId ? { ...n, read: true } : n);
  localStorage.setItem("paynex_notifications", JSON.stringify(userNotifications));
  renderNotifications();
};

function showToast(title, message, type = "purchase") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-card ${type}`;

  const icon = type === "sale" ? "🎉" : type === "purchase" ? "🛒" : "📦";
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${message}</div>
    </div>
    <button class="toast-close" title="Cerrar">✕</button>
  `;

  toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Hace un momento";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

// ================= 5. GESTIÓN DE PEDIDOS Y COMPRAS =================
function initOrders() {
  const tabs = document.querySelectorAll(".order-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetSubView = tab.getAttribute("data-order-tab");
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".orders-subview").forEach(sv => sv.classList.remove("active"));
      const activeSv = document.getElementById(`orderSubView-${targetSubView}`);
      if (activeSv) activeSv.classList.add("active");
    });
  });

  renderOrders();
}

function renderOrders() {
  const sellerTable = document.getElementById("sellerOrdersTableBody");
  const buyerTable = document.getElementById("buyerOrdersTableBody");
  const sellerBadge = document.getElementById("sellerOrdersBadge");
  const buyerBadge = document.getElementById("buyerOrdersBadge");

  if (sellerBadge) sellerBadge.textContent = userOrders.length;
  if (buyerBadge) buyerBadge.textContent = userOrders.length;

  // 1. Tabla Vendedor: Pedidos Recibidos con Selector de Estado
  if (sellerTable) {
    if (userOrders.length === 0) {
      sellerTable.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No hay pedidos registrados en este momento.</td></tr>`;
    } else {
      sellerTable.innerHTML = userOrders.map(ord => `
        <tr>
          <td><strong>#${ord.id}</strong></td>
          <td>
            <div class="product-item-cell">
              <img src="${ord.productImage || 'img/login_panel.png'}" class="product-thumb">
              <div>
                <strong>${ord.productName}</strong>
                <div style="font-size: 11px; color: #64748b;">Cant: ${ord.quantity || 1} un.</div>
              </div>
            </div>
          </td>
          <td>
            <strong>${ord.buyerName || 'Comprador'}</strong>
            <div style="font-size: 11px; color: #64748b;">${ord.buyerEmail || ''}</div>
          </td>
          <td><strong>$${(ord.totalAmount || ord.price || 0).toLocaleString("es-CO")}</strong></td>
          <td style="font-size: 12px; color: #64748b;">${formatRelativeTime(ord.createdAt)}</td>
          <td>
            <span class="status-badge ${getStatusBadgeClass(ord.status)}">${ord.status}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <select id="selectStatus-${ord.id}" class="order-status-select">
                <option value="Pendiente" ${ord.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="En preparación" ${ord.status === 'En preparación' ? 'selected' : ''}>En preparación</option>
                <option value="Enviado" ${ord.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                <option value="Entregado" ${ord.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
                <option value="Cancelado" ${ord.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
              <button class="action-btn edit" onclick="updateOrderStatus('${ord.id}')" title="Guardar nuevo estado">
                💾
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  // 2. Tabla Comprador: Mis Compras
  if (buyerTable) {
    if (userOrders.length === 0) {
      buyerTable.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No has realizado compras aún.</td></tr>`;
    } else {
      buyerTable.innerHTML = userOrders.map(ord => `
        <tr>
          <td><strong>#${ord.id}</strong></td>
          <td>
            <div class="product-item-cell">
              <img src="${ord.productImage || 'img/login_panel.png'}" class="product-thumb">
              <div>
                <strong>${ord.productName}</strong>
                <div style="font-size: 11px; color: #64748b;">Cant: ${ord.quantity || 1} un.</div>
              </div>
            </div>
          </td>
          <td>${ord.sellerName || 'Vendedor Oficial'}</td>
          <td><strong>$${(ord.totalAmount || ord.price || 0).toLocaleString("es-CO")}</strong></td>
          <td style="font-size: 12px; color: #64748b;">${formatRelativeTime(ord.createdAt)}</td>
          <td>
            <span class="status-badge ${getStatusBadgeClass(ord.status)}">${ord.status}</span>
          </td>
        </tr>
      `).join('');
    }
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "Pendiente": return "pending";
    case "En preparación": return "pending";
    case "Enviado": return "completed";
    case "Entregado": return "active";
    case "Cancelado": return "minus";
    default: return "active";
  }
}

// Actualizar estado de pedido y disparar notificación al comprador
window.updateOrderStatus = async function(orderId) {
  const selectEl = document.getElementById(`selectStatus-${orderId}`);
  if (!selectEl) return;
  const newStatus = selectEl.value;

  const orderIndex = userOrders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return;

  const order = userOrders[orderIndex];
  const oldStatus = order.status;
  if (oldStatus === newStatus) {
    alert("El pedido ya se encuentra en estado: " + newStatus);
    return;
  }

  order.status = newStatus;
  localStorage.setItem("paynex_orders", JSON.stringify(userOrders));

  // Actualizar en Firestore
  try {
    const q = query(collection(db, "orders"), where("id", "==", orderId), limit(1));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
      await updateDoc(doc(db, "orders", d.id), { status: newStatus });
    });
  } catch (err) {
    console.warn("Guardando estado en local:", err);
  }

  // Notificación al Comprador por cambio de estado en su pedido
  await createNotification({
    userId: order.buyerId,
    type: "order_status",
    title: `📦 Cambio en tu pedido #${order.id}`,
    message: `El estado de tu pedido "${order.productName}" ha cambiado de "${oldStatus}" a: "${newStatus}".`,
    orderId: order.id
  });

  renderOrders();
  alert(`¡Estado del pedido #${orderId} actualizado a "${newStatus}" con éxito!\nSe envió la notificación correspondiente al comprador.`);
};

// ================= 6. MODAL Y EJECUCIÓN DE COMPRAS =================
function initPurchaseModal() {
  const modal = document.getElementById("purchaseModal");
  const btnOpen = document.getElementById("btnOpenPurchaseModal");
  const btnClose = document.getElementById("btnClosePurchaseModal");
  const btnCancel = document.getElementById("btnCancelPurchaseModal");
  const form = document.getElementById("purchaseForm");

  const productSelect = document.getElementById("purchaseProductSelect");
  const priceInput = document.getElementById("purchaseProductPrice");
  const qtyInput = document.getElementById("purchaseQuantity");
  const totalText = document.getElementById("purchaseTotalText");
  const sellerInput = document.getElementById("purchaseSellerName");
  const buyerInput = document.getElementById("purchaseBuyerName");

  const updateCalculations = () => {
    const selectedId = parseInt(productSelect.value);
    const prod = userProducts.find(p => p.id === selectedId);
    if (!prod) return;

    const qty = parseInt(qtyInput.value) || 1;
    priceInput.value = `$${prod.price.toLocaleString("es-CO")}`;
    sellerInput.value = prod.sellerName || "Valentina Gómez";
    const total = prod.price * qty;
    totalText.textContent = `$${total.toLocaleString("es-CO")} COP`;
  };

  const populateSelect = () => {
    productSelect.innerHTML = userProducts.map(p => `
      <option value="${p.id}">${p.name} - $${p.price.toLocaleString("es-CO")} (Stock: ${p.stock})</option>
    `).join('');
    updateCalculations();
  };

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      populateSelect();
      if (buyerInput && currentUser) {
        buyerInput.value = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
      }
      modal.classList.add("active");
    });
  }

  const closeModal = () => modal.classList.remove("active");
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (productSelect) productSelect.addEventListener("change", updateCalculations);
  if (qtyInput) qtyInput.addEventListener("input", updateCalculations);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const prodId = parseInt(productSelect.value);
      const qty = parseInt(qtyInput.value) || 1;
      const buyerName = buyerInput.value.trim() || "Comprador";

      await executePurchase({ productId: prodId, quantity: qty, buyerName });
      closeModal();
    });
  }
}

async function executePurchase({ productId, quantity, buyerName }) {
  const prod = userProducts.find(p => p.id === productId);
  if (!prod) return;

  if (prod.stock < quantity) {
    alert("No hay suficiente stock disponible para este producto.");
    return;
  }

  // Descontar stock
  prod.stock -= quantity;
  localStorage.setItem("paynex_products", JSON.stringify(userProducts));

  const total = prod.price * quantity;
  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  const buyerId = currentUser?.uid || "buyer_current";
  const sellerId = prod.sellerId || "seller_default";

  const newOrder = {
    id: orderId,
    productId: prod.id,
    productName: prod.name,
    productImage: prod.image,
    buyerId: buyerId,
    buyerName: buyerName,
    buyerEmail: currentUser?.email || "comprador@correo.com",
    sellerId: sellerId,
    sellerName: prod.sellerName || "Valentina Gómez",
    sellerEmail: "valentina@correo.com",
    price: prod.price,
    quantity: quantity,
    totalAmount: total,
    status: "Pendiente",
    createdAt: Date.now()
  };

  // Guardar pedido en Firestore
  try {
    await addDoc(collection(db, "orders"), newOrder);
  } catch (err) {
    console.warn("Guardando orden localmente:", err);
  }

  userOrders.unshift(newOrder);
  localStorage.setItem("paynex_orders", JSON.stringify(userOrders));

  // Registrar transacción de saldo para el vendedor
  availableBalance += total;
  localStorage.setItem("paynex_balance", availableBalance);
  userTransactions.unshift({
    id: Date.now(),
    type: "income",
    title: `Venta: ${prod.name} (${quantity} un.)`,
    date: "Ahora mismo",
    amount: total
  });
  localStorage.setItem("paynex_transactions", JSON.stringify(userTransactions));

  // 1. NOTIFICACIÓN AL COMPRADOR
  await createNotification({
    userId: buyerId,
    type: "purchase",
    title: "🛒 ¡Compra realizada con éxito!",
    message: `Has adquirido ${quantity}x "${prod.name}" por un total de $${total.toLocaleString("es-CO")} COP. Pedido registrado #${orderId}.`,
    orderId: orderId
  });

  // 2. NOTIFICACIÓN AL VENDEDOR
  await createNotification({
    userId: sellerId,
    type: "sale",
    title: "🎉 ¡Has recibido una nueva compra!",
    message: `El comprador ${buyerName} ha comprado ${quantity}x "${prod.name}" por $${total.toLocaleString("es-CO")} COP. ¡Prepara el pedido!`,
    orderId: orderId
  });

  renderOrders();
  renderProductsTable();
  renderFinances();
  renderDashboard();

  alert(`¡Compra procesada con éxito!\nPedido #${orderId} registrado.\nSe han generado las notificaciones en tiempo real para el comprador y el vendedor.`);
}

// ================= 7. SECCIÓN DE MENSAJES (CHATS CON FIRESTORE) =================
const DEFAULT_CONTACTS = [
  { id: "support_paynex", name: "Soporte PayNex Oficial", role: "Soporte", avatar: "img/logo.png", lastMsg: "¡Hola! ¿En qué podemos ayudarte?" },
  { id: "buyer_carlos", name: "Carlos Ruiz (Comprador)", role: "Comprador", avatar: "img/register_illustration.png", lastMsg: "¿Tienes disponibilidad de tenis en talla 40?" },
  { id: "seller_laura", name: "Laura Herrera (Vendedora)", role: "Vendedora", avatar: "img/login_illustration.png", lastMsg: "Acabo de despachar tu último pedido." }
];

let chatContacts = [...DEFAULT_CONTACTS];

function getChatId(id1, id2) {
  return [String(id1), String(id2)].sort().join('_');
}

function initMessages() {
  const searchInput = document.getElementById("searchContactsInput");
  const form = document.getElementById("chatMessageForm");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      renderChatContacts(chatContacts.filter(c => 
        c.name.toLowerCase().includes(query) || c.role.toLowerCase().includes(query)
      ));
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("chatInputMessage");
      const text = input.value.trim();
      if (!text || !currentChatContact) return;

      input.value = "";
      await sendChatMessage(text);
    });
  }

  renderChatContacts(chatContacts);
  // Seleccionar primer contacto por defecto
  if (chatContacts.length > 0) {
    selectChatContact(chatContacts[0]);
  }
}

async function loadUsersForChat() {
  try {
    const q = query(collection(db, "users"), limit(10));
    const snap = await getDocs(q);
    const registeredUsers = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.uid !== currentUser.uid && data.email !== currentUser.email) {
        registeredUsers.push({
          id: data.uid || d.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
          role: data.role || "usuario",
          avatar: data.photoURL || "img/register_panel.png",
          lastMsg: "Contacto registrado en PayNex"
        });
      }
    });

    if (registeredUsers.length > 0) {
      chatContacts = [...DEFAULT_CONTACTS, ...registeredUsers];
      renderChatContacts(chatContacts);
    }
  } catch (err) {
    console.warn("No se pudieron cargar usuarios adicionales de Firestore para chat:", err);
  }
}

function renderChatContacts(contactsToRender) {
  const listEl = document.getElementById("chatContactsList");
  if (!listEl) return;

  listEl.innerHTML = contactsToRender.map(c => {
    const isActive = currentChatContact && currentChatContact.id === c.id;
    return `
      <div class="chat-contact-item ${isActive ? 'active' : ''}" onclick="selectChatContactById('${c.id}')">
        <img src="${c.avatar}" alt="${c.name}" class="chat-contact-avatar">
        <div class="chat-contact-info">
          <div class="chat-contact-top">
            <span class="chat-contact-name">${c.name}</span>
            <span class="chat-role-pill">${(c.role || 'USUARIO').toUpperCase()}</span>
          </div>
          <div class="chat-contact-lastmsg">${c.lastMsg || 'Comienza una conversación'}</div>
        </div>
      </div>
    `;
  }).join('');
}

window.selectChatContactById = function(contactId) {
  const contact = chatContacts.find(c => c.id === contactId);
  if (contact) selectChatContact(contact);
};

function selectChatContact(contact) {
  currentChatContact = contact;

  // Actualizar cabecera activa
  const nameEl = document.getElementById("activeChatName");
  const avatarEl = document.getElementById("activeChatAvatar");
  const roleEl = document.getElementById("activeChatRole");

  if (nameEl) nameEl.textContent = contact.name;
  if (avatarEl) avatarEl.src = contact.avatar;
  if (roleEl) roleEl.textContent = (contact.role || "USUARIO").toUpperCase();

  renderChatContacts(chatContacts);

  // Escuchar mensajes en tiempo real desde Firestore
  const myId = currentUser ? (currentUser.uid || currentUser.email) : "me";
  const chatId = getChatId(myId, contact.id);

  if (unsubscribeMessagesListener) {
    unsubscribeMessagesListener();
    unsubscribeMessagesListener = null;
  }

  try {
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    unsubscribeMessagesListener = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderChatMessages(msgs);
    }, (err) => {
      console.warn("Error en onSnapshot de mensajes, usando respaldo local:", err);
      renderChatMessages(getLocalChatMessages(chatId));
    });
  } catch (err) {
    console.warn("Fallo al suscribir a mensajes:", err);
    renderChatMessages(getLocalChatMessages(chatId));
  }
}

async function sendChatMessage(text) {
  if (!currentChatContact) return;

  const myId = currentUser ? (currentUser.uid || currentUser.email) : "me";
  const myName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email : "Tú";
  const myAvatar = currentUser?.photoURL || "img/register_panel.png";
  const chatId = getChatId(myId, currentChatContact.id);

  const messageData = {
    chatId: chatId,
    senderId: myId,
    senderName: myName,
    senderAvatar: myAvatar,
    receiverId: currentChatContact.id,
    receiverName: currentChatContact.name,
    text: text,
    createdAt: Date.now()
  };

  // Guardar en Firestore
  try {
    await addDoc(collection(db, "messages"), messageData);
  } catch (err) {
    console.warn("Guardando mensaje localmente por fallo en Firestore:", err);
    saveLocalChatMessage(messageData);
    renderChatMessages(getLocalChatMessages(chatId));
  }

  // Actualizar snippet de último mensaje
  currentChatContact.lastMsg = text;
  renderChatContacts(chatContacts);

  // Si se le escribe a Soporte PayNex, generar respuesta automática tras 1.2 segundos
  if (currentChatContact.id === "support_paynex") {
    setTimeout(async () => {
      const autoReply = {
        chatId: chatId,
        senderId: "support_paynex",
        senderName: "Soporte PayNex Oficial",
        senderAvatar: "img/logo.png",
        receiverId: myId,
        receiverName: myName,
        text: `Hola ${currentUser?.firstName || 'amigo'}, hemos recibido tu mensaje: "${text}". Un asesor revisará tu caso de inmediato. 🚀`,
        createdAt: Date.now()
      };

      try {
        await addDoc(collection(db, "messages"), autoReply);
      } catch (e) {
        saveLocalChatMessage(autoReply);
        renderChatMessages(getLocalChatMessages(chatId));
      }
    }, 1200);
  }
}

function renderChatMessages(messages) {
  const container = document.getElementById("chatMessagesContainer");
  if (!container) return;

  const myId = currentUser ? (currentUser.uid || currentUser.email) : "me";

  if (messages.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; font-size: 13px; margin: auto;">
        <div style="font-size: 32px; margin-bottom: 8px;">💬</div>
        No hay mensajes previos en esta conversación.<br>¡Escribe algo para comenzar a chatear!
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isOutgoing = msg.senderId === myId;
    const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="chat-bubble-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <img src="${msg.senderAvatar || (isOutgoing ? 'img/register_panel.png' : 'img/login_panel.png')}" class="chat-msg-avatar">
        <div class="chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${!isOutgoing ? `<div class="chat-msg-author">${msg.senderName || 'Contacto'}</div>` : ''}
          <div>${escapeHtml(msg.text)}</div>
          <div class="chat-msg-time">${time}</div>
        </div>
      </div>
    `;
  }).join('');

  // Auto-scroll al final
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getLocalChatMessages(chatId) {
  const all = JSON.parse(localStorage.getItem(`paynex_msgs_${chatId}`)) || [];
  return all;
}

function saveLocalChatMessage(msg) {
  const key = `paynex_msgs_${msg.chatId}`;
  const all = JSON.parse(localStorage.getItem(key)) || [];
  all.push(msg);
  localStorage.setItem(key, JSON.stringify(all));
}

// ================= 8. DASHBOARD (INICIO) =================
function renderDashboard() {
  const balanceEl = document.getElementById("statBalance");
  if (balanceEl) balanceEl.textContent = `$${availableBalance.toLocaleString("es-CO")}`;

  const totalProductsEl = document.getElementById("statProductsCount");
  if (totalProductsEl) totalProductsEl.textContent = userProducts.length;

  const recentSalesTable = document.getElementById("recentSalesTableBody");
  if (recentSalesTable) {
    recentSalesTable.innerHTML = userProducts.slice(0, 3).map(prod => `
      <tr>
        <td>
          <div class="product-item-cell">
            <img src="${prod.image}" alt="${prod.name}" class="product-thumb">
            <div>
              <strong>${prod.name}</strong>
              <div style="font-size: 12px; color: #64748b;">${prod.category}</div>
            </div>
          </div>
        </td>
        <td><strong>$${prod.price.toLocaleString("es-CO")}</strong></td>
        <td><span class="status-badge active">Completado</span></td>
        <td style="color: #64748b; font-size: 13px;">Hoy</td>
      </tr>
    `).join('');
  }
}

// ================= 9. CRUD DE PRODUCTOS =================
function renderProductsTable(filterText = "") {
  const tableBody = document.getElementById("productsTableBody");
  if (!tableBody) return;

  const filtered = userProducts.filter(p => 
    p.name.toLowerCase().includes(filterText.toLowerCase()) || 
    p.category.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">No se encontraron productos registrados.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(prod => `
    <tr>
      <td>
        <div class="product-item-cell">
          <img src="${prod.image}" alt="${prod.name}" class="product-thumb">
          <strong>${prod.name}</strong>
        </div>
      </td>
      <td>${prod.category}</td>
      <td><strong>$${prod.price.toLocaleString("es-CO")}</strong></td>
      <td>${prod.stock} unidades</td>
      <td><span class="status-badge active">${prod.status}</span></td>
      <td>
        <button class="action-btn edit" onclick="editProduct(${prod.id})" title="Editar">✏️</button>
        <button class="action-btn delete" onclick="deleteProduct(${prod.id})" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function initProductModal() {
  const modal = document.getElementById("productModal");
  const btnOpen = document.getElementById("btnOpenNewProductModal");
  const btnClose = document.getElementById("btnCloseProductModal");
  const btnCancel = document.getElementById("btnCancelProductModal");
  const productForm = document.getElementById("newProductForm");
  const searchInput = document.getElementById("searchProductsInput");

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      productForm.reset();
      document.getElementById("modalProductId").value = "";
      document.getElementById("modalTitleText").textContent = "Nuevo Producto";
      modal.classList.add("active");
    });
  }

  const closeModal = () => modal.classList.remove("active");
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("modalProductId").value;
      const name = document.getElementById("prodName").value;
      const category = document.getElementById("prodCategory").value;
      const price = parseFloat(document.getElementById("prodPrice").value) || 0;
      const stock = parseInt(document.getElementById("prodStock").value) || 1;
      const imageInput = document.getElementById("prodImageUrl").value;
      const image = imageInput.trim() || "img/login_panel.png";

      if (id) {
        userProducts = userProducts.map(p => p.id == id ? { ...p, name, category, price, stock, image } : p);
      } else {
        const newProd = {
          id: Date.now(),
          name,
          category,
          price,
          stock,
          status: "Activo",
          image,
          sellerId: currentUser?.uid || "seller_default",
          sellerName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : "Valentina Gómez"
        };
        userProducts.unshift(newProd);
      }

      localStorage.setItem("paynex_products", JSON.stringify(userProducts));
      renderProductsTable();
      renderDashboard();
      closeModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderProductsTable(e.target.value));
  }
}

window.deleteProduct = function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
    userProducts = userProducts.filter(p => p.id !== id);
    localStorage.setItem("paynex_products", JSON.stringify(userProducts));
    renderProductsTable();
    renderDashboard();
  }
};

window.editProduct = function(id) {
  const prod = userProducts.find(p => p.id == id);
  if (!prod) return;

  document.getElementById("modalProductId").value = prod.id;
  document.getElementById("prodName").value = prod.name;
  document.getElementById("prodCategory").value = prod.category;
  document.getElementById("prodPrice").value = prod.price;
  document.getElementById("prodStock").value = prod.stock;
  document.getElementById("prodImageUrl").value = prod.image;
  document.getElementById("modalTitleText").textContent = "Editar Producto";

  document.getElementById("productModal").classList.add("active");
};

// ================= 10. FINANZAS Y RETIROS =================
function renderFinances() {
  const financeBalanceEl = document.getElementById("financeAvailableBalance");
  if (financeBalanceEl) financeBalanceEl.textContent = `$${availableBalance.toLocaleString("es-CO")}`;

  const txListEl = document.getElementById("transactionHistoryList");
  if (txListEl) {
    txListEl.innerHTML = userTransactions.map(tx => `
      <div class="transaction-item">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: ${tx.amount > 0 ? '#d1fae5' : '#fee2e2'}; display: flex; align-items: center; justify-content: center; font-size: 16px;">
            ${tx.amount > 0 ? '💰' : '💸'}
          </div>
          <div>
            <strong>${tx.title}</strong>
            <div style="font-size: 12px; color: #64748b;">${tx.date}</div>
          </div>
        </div>
        <div class="tx-amount ${tx.amount > 0 ? 'plus' : 'minus'}">
          ${tx.amount > 0 ? '+' : ''}$${Math.abs(tx.amount).toLocaleString("es-CO")}
        </div>
      </div>
    `).join('');
  }
}

function initWithdrawForm() {
  const withdrawForm = document.getElementById("withdrawForm");
  if (!withdrawForm) return;

  withdrawForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const method = document.getElementById("withdrawMethod").value;
    const account = document.getElementById("withdrawAccount").value;
    const amount = parseFloat(document.getElementById("withdrawAmount").value) || 0;

    if (amount <= 0 || amount > availableBalance) {
      alert("El monto de retiro supera tu saldo disponible o es inválido.");
      return;
    }

    availableBalance -= amount;
    localStorage.setItem("paynex_balance", availableBalance);

    userTransactions.unshift({
      id: Date.now(),
      type: "withdraw",
      title: `Retiro a ${method.toUpperCase()} (${account})`,
      date: "Ahora mismo",
      amount: -amount
    });

    localStorage.setItem("paynex_transactions", JSON.stringify(userTransactions));

    alert(`¡Solicitud de retiro efectuada con éxito por $${amount.toLocaleString("es-CO")} a ${method.toUpperCase()}!`);
    withdrawForm.reset();
    renderFinances();
    renderDashboard();
  });
}

// ================= 11. FORMULARIO DE PERFIL =================
function initProfileForm() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("profileFullName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    const username = document.getElementById("profileUsername").value.trim();
    const role = document.getElementById("profileRole").value;

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Usuario";
    const lastName = nameParts.slice(1).join(" ") || "";

    currentUser = {
      ...currentUser,
      firstName,
      lastName,
      email,
      username,
      role
    };

    // Guardar en Firestore
    try {
      if (currentUser.uid && !currentUser.isTemp) {
        await setDoc(doc(db, "users", currentUser.uid), {
          firstName,
          lastName,
          username,
          role
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore error guardando datos de perfil:", fsErr);
    }

    sessionStorage.setItem("paynex_temp_user", JSON.stringify(currentUser));
    updateUIWithUser(currentUser);
    showToast("Perfil Actualizado", "Tus datos personales se han guardado exitosamente.", "sale");
    alert("¡Tus datos de perfil han sido actualizados con éxito!");
  });
}
