import { checkAuthState, logoutUser } from "./auth.js";
import { db, doc, getDoc, setDoc } from "./firebase-confi.js";

// Datos iniciales de simulación por defecto (si no existen en localStorage)
const INITIAL_PRODUCTS = [
  { id: 1, name: "Camiseta Oversize", category: "Ropa & Moda", price: 85000, stock: 15, status: "Activo", image: "img/login_panel.png" },
  { id: 2, name: "Gorra Béisbol Streetwear", category: "Accesorios", price: 55000, stock: 8, status: "Activo", image: "img/register_panel.png" },
  { id: 3, name: "Tenis Personalizados VR", category: "Calzado", price: 210000, stock: 5, status: "Activo", image: "img/register_illustration.png" },
  { id: 4, name: "Visor VR Headset Pro", category: "Tecnología", price: 320000, stock: 3, status: "Activo", image: "img/login_illustration.png" }
];

const INITIAL_TRANSACTIONS = [
  { id: 101, type: "income", title: "Venta: Camiseta Oversize", date: "Hoy, 02:45 PM", amount: 85000 },
  { id: 102, type: "income", title: "Venta: Gorra Béisbol Streetwear", date: "Ayer, 06:12 PM", amount: 55000 },
  { id: 103, type: "withdraw", title: "Retiro a Nequi (312***4567)", date: "28 Ago 2026", amount: -150000 },
  { id: 104, type: "income", title: "Venta: Tenis Personalizados", date: "25 Ago 2026", amount: 210000 }
];

// Estado global local
let currentUser = null;
let userProducts = JSON.parse(localStorage.getItem("paynex_products")) || INITIAL_PRODUCTS;
let userTransactions = JSON.parse(localStorage.getItem("paynex_transactions")) || INITIAL_TRANSACTIONS;
let availableBalance = parseFloat(localStorage.getItem("paynex_balance")) || 320000;

document.addEventListener("DOMContentLoaded", () => {
  initAuthState();
  initNavigation();
  renderDashboard();
  renderProductsTable();
  renderFinances();
  initProductModal();
  initWithdrawForm();
  initProfileForm();
});

// 1. Inicializar Autenticación y Cargar Usuario
function initAuthState() {
  checkAuthState((user, userData) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUser = {
      ...user,
      ...userData,
      firstName: userData?.firstName || "Valentina",
      lastName: userData?.lastName || "Gómez",
      email: user.email || "valentina@correo.com",
      role: userData?.role || "vendedor",
      username: userData?.username || "@valengomez"
    };

    updateUIWithUser(currentUser);
  });

  const btnLogout = document.getElementById("btnLogoutSidebar");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => logoutUser());
  }
}

function updateUIWithUser(user) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  
  // Elementos Header
  const headerGreeting = document.getElementById("headerGreeting");
  if (headerGreeting) headerGreeting.textContent = `¡Hola, ${user.firstName || 'Usuario'}! 👋`;

  const topAvatar = document.getElementById("topUserAvatar");
  if (topAvatar) topAvatar.src = user.photoURL || "img/register_panel.png";

  const topName = document.getElementById("topUserName");
  if (topName) topName.textContent = fullName;

  const topRole = document.getElementById("topUserRole");
  if (topRole) topRole.textContent = user.role.toUpperCase();

  // Formulario Perfil
  const profileNameInput = document.getElementById("profileFullName");
  if (profileNameInput) profileNameInput.value = fullName;

  const profileEmailInput = document.getElementById("profileEmail");
  if (profileEmailInput) profileEmailInput.value = user.email;

  const profileUsernameInput = document.getElementById("profileUsername");
  if (profileUsernameInput) profileUsernameInput.value = user.username || `@${(user.firstName || 'usuario').toLowerCase()}`;

  const profileRoleInput = document.getElementById("profileRole");
  if (profileRoleInput) profileRoleInput.value = user.role;
}

// 2. Navegación SPA entre secciones
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

  // Enlaces rápidos entre secciones
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

// 3. Renderizar Dashboard (Inicio)
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

// 4. Renderizar Tabla CRUD de Productos
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

// 5. Modal de Creación / Edición de Producto
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
        // Editar
        userProducts = userProducts.map(p => p.id == id ? { ...p, name, category, price, stock, image } : p);
      } else {
        // Crear nuevo
        const newProd = {
          id: Date.now(),
          name,
          category,
          price,
          stock,
          status: "Activo",
          image
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

// Funciones globales para botones onclick en la tabla
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

// 6. Sección de Finanzas y Simulación de Retiros
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

// 7. Sección de Perfil y Configuración
function initProfileForm() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  profileForm.addEventListener("submit", (e) => {
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

    // Actualizar sesión local
    sessionStorage.setItem("paynex_temp_user", JSON.stringify(currentUser));
    updateUIWithUser(currentUser);
    alert("¡Tus datos de perfil han sido actualizados con éxito!");
  });
}
