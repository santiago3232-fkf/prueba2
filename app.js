"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const counter = document.getElementById("contador");
  const products = [...document.querySelectorAll(".producto")];
  const selectedProducts = new Set();

  if (!counter || products.length === 0) {
    console.error("La tienda 3D necesita el contador #contador y al menos un producto .producto.");
    return;
  }

  products.forEach((product, index) => {
    const productId = `producto-${index + 1}`;
    const originalColor = product.getAttribute("color") || "#ffffff";

    product.addEventListener("click", () => {
      if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
        product.setAttribute("color", originalColor);
      } else {
        selectedProducts.add(productId);
        product.setAttribute("color", "#00b87c");
      }
      counter.textContent = String(selectedProducts.size);
    });
  });
});
