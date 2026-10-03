/**
 * ==============================================================================
 * PAYNEX CHATBOT ASISTENTE VIRTUAL (NEXY)
 * ==============================================================================
 * Ubicación: Flotante inferior izquierda (Bottom-Left)
 * Seguridad: Sanitización completa contra XSS, sin eval, validación de entrada,
 *             aislamiento de eventos y enlaces seguros.
 * ==============================================================================
 */

(function () {
  'use strict';

  // Configuración global del asistente PayNex
  const BOT_CONFIG = {
    botName: "Nexy",
    botTitle: "Asistente PayNex",
    botStatus: "En línea • Ayuda 24/7",
    avatarImg: "img/d55cc77d-427c-475a-bfd1-8a84c49639dc.png",
    supportEmail: "san.18gutierrez@gmail.com",
    supportPhone: "3224045855",
    supportPhoneFormatted: "+57 322 404 5855",
    supportWhatsapp: "573224045855",
    supportWhatsappFormatted: "+57 322 404 5855",
    leaderName: "Santiago Gutiérrez",
    storageKey: "paynex_chat_history_v2",
    storageMuteKey: "paynex_chat_muted_v1",
    maxInputChars: 400,
    typingDelayMs: 650
  };

  // Base de conocimiento exhaustiva y estructurada de PayNex según su modelo institucional
  const KNOWLEDGE_BASE = [
    {
      keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "saludos", "hey", "inicio"],
      response: `¡Hola! Soy **${BOT_CONFIG.botName}**, el asistente oficial de **PayNex** 🚀\n\n` +
        `En PayNex nos especializamos en la **logística de e-commerce y mediación para que jóvenes y menores de edad puedan emprender** y generar ingresos de forma segura.\n\n` +
        `¿En qué puedo orientarte hoy?`,
      chips: ["📞 Contacto Directo", "🌟 ¿Qué es PayNex?", "🛍️ Productos", "🚀 ¿Cómo Vender?"]
    },
    {
      keywords: ["contacto", "telefono", "whatsapp", "correo", "email", "soporte", "asesor", "hablar con", "atencion", "comunicarme", "numero", "donde estan", "oficina", "llamar", "celular", "santiago", "gutierrez"],
      response: `📞 **Canales Oficiales de Contacto PayNex**:\n\n` +
        `• 📱 **WhatsApp Oficial:** [${BOT_CONFIG.supportWhatsappFormatted}](https://wa.me/${BOT_CONFIG.supportWhatsapp}?text=Hola%20Santiago,%20solicito%20informaci%C3%B3n%20sobre%20PayNex)\n` +
        `• ☎️ **Teléfono / Llamadas:** [${BOT_CONFIG.supportPhone}](tel:${BOT_CONFIG.supportPhone})\n` +
        `• ✉️ **Correo Electrónico:** [${BOT_CONFIG.supportEmail}](mailto:${BOT_CONFIG.supportEmail})\n` +
        `• 👤 **Atención Directa:** Santiago Gutiérrez (Líder del proyecto) y equipo PayNex.\n` +
        `• ⏰ **Horario:** Lunes a Sábado de 8:00 AM a 7:00 PM\n` +
        `• 🇨🇴 **Cobertura:** Envíos y soporte a nivel nacional en toda Colombia.`,
      chips: ["💬 Abrir WhatsApp", "📞 Llamar ahora", "✉️ Enviar correo", "🛍️ Ver Productos"]
    },
    {
      keywords: ["que es paynex", "que es painex", "painex", "paynex", "de que trata", "que hacen", "plataforma", "para que sirve", "sobre ustedes", "servicio", "empresa de tecnologia"],
      response: `🌟 **¿Qué es PayNex? (Logística de E-commerce y Tecnología)**\n\n` +
        `**PayNex** es una empresa de tecnología y logística de vendedores de productos (e-commerce).\n\n` +
        `Ofrecemos un **servicio exclusivo de representación y mediación de jóvenes menores de edad a ventas** por medio de nuestra aplicación, para asegurar el bienestar y las ganancias de nuestros usuarios.\n\n` +
        `💡 Ayudamos a los jóvenes a emprender en un **alto nivel de negocio digital**, generando ingresos de manera segura, efectiva y complaciendo las necesidades y preferencias de nuestros clientes.`,
      chips: ["🎯 Misión y Visión", "💡 Problemática que resolvemos", "💎 Valores Corporativos", "🚀 ¿Cómo Emprender?"]
    },
    {
      keywords: ["problematica", "problema", "por que nacio", "por que crearon", "que solucionan", "origen", "motivo"],
      response: `💡 **Problemática que Soluciona PayNex**:\n\n` +
        `Nuestra problemática comienza siendo menores de edad: muchos jóvenes quieren **generar ingresos de manera virtual**, pero las plataformas existentes les exigen requisitos excluyentes o complejos, pidiendo veracidad de datos e incluso cuentas bancarias que los menores no poseen.\n\n` +
        `🤝 **La Solución PayNex:** Actuamos como puente legal, mediador y representante tecnológico para garantizar que los jóvenes puedan comercializar productos, asegurar sus ganancias y contar con un ecosistema seguro tanto para compradores como para vendedores.`,
      chips: ["👶 Menores de Edad", "🎯 Objetivos", "📞 Contactar Asesor"]
    },
    {
      keywords: ["menores de edad", "menor de edad", "puedo vender si soy menor", "menor", "edad minima", "requisitos edad", "jovenes", "adolescentes", "cuentas bancarias"],
      response: `👶 **¿Puedo vender y emprender si soy menor de edad?**\n\n` +
        `¡Sí, totalmente! Ese es el **propósito fundamental de PayNex**.\n\n` +
        `• Te representamos y mediamos tus ventas de forma transparente y legal.\n` +
        `• No te dejamos fuera por no tener cuenta bancaria tradicional de adulto.\n` +
        `• Protegemos tus ingresos y te damos herramientas para administrar tus productos y pedidos desde un panel intuitivo.\n` +
        `• Cuidamos tu bienestar en cada transacción.`,
      chips: ["🚀 Empezar a Vender", "📞 Hablar con Santiago", "🛡️ Seguridad"]
    },
    {
      keywords: ["mision", "nuestra mision", "cual es la mision"],
      response: `🎯 **Nuestra Misión en PayNex**:\n\n` +
        `"Al día de hoy nuestra misión es **ayudar a nuestros jóvenes para que puedan generar ingresos de manera virtual**, garantizando la seguridad de cada usuario que integre nuestra empresa, desde los vendedores hasta los clientes."`,
      chips: ["🔭 Nuestra Visión", "💎 Valores Corporativos", "🚀 Emprender"]
    },
    {
      keywords: ["vision", "nuestra vision", "cual es la vision", "futuro"],
      response: `🔭 **Nuestra Visión en PayNex**:\n\n` +
        `• Ser una empresa conocida a nivel Colombia y a nivel mundial reconocida por nuestra versatilidad.\n` +
        `• Lograr a corto plazo al menos **20 clientes activos al día** para brindar un servicio de máxima calidad y utilidad para nuestros clientes y usuarios.`,
      chips: ["🎯 Objetivos", "💎 Valores Corporativos", "🛍️ Ver Productos"]
    },
    {
      keywords: ["valores", "valores corporativos", "principios", "filosofia"],
      response: `💎 **Valores Corporativos de PayNex**:\n\n` +
        `1️⃣ **Innovación:** Crear soluciones modernas y eficientes para nuestros usuarios.\n` +
        `2️⃣ **Confianza:** Brindaremos seguridad en cada compra y pago a quienes usen nuestros servicios.\n` +
        `3️⃣ **Compromiso:** Ofrecer la mejor experiencia al cliente, asegurando que todo sea con respeto y buena comunicación.`,
      chips: ["🌟 ¿Qué es PayNex?", "🛡️ Seguridad y Pagos", "📞 Contacto"]
    },
    {
      keywords: ["objetivos", "objetivo general", "objetivos especificos", "metas"],
      response: `📈 **Objetivos de PayNex**:\n\n` +
        `🌐 **Objetivo General:**\n` +
        `Ser una empresa a nivel mundial y reconocida por nuestra **versatilidad** e impacto en el e-commerce juvenil.\n\n` +
        `🎯 **Objetivos Específicos:**\n` +
        `• Lograr nuestra primera ganancia exitosa en un plazo de un mes.\n` +
        `• Demostrar nuestra viabilidad financiera y operativa.\n` +
        `• Ser una oportunidad real y accesible de generar dinero.\n` +
        `• Posicionarnos dentro de las 50 apps más usadas en Colombia.\n` +
        `• Ser utilizada por más de un estrato socioeconómico sin barreras.`,
      chips: ["🔭 Nuestra Visión", "🚀 ¿Cómo Vender?", "📞 Contacto"]
    },
    {
      keywords: ["equipo", "quienes forman", "fundadores", "creadores", "organigrama", "estructura", "santiago gutierrez", "daniel paez", "samuel paez", "jostin gonzales"],
      response: `👥 **Estructura y Equipo de PayNex**:\n\n` +
        `• 👑 **Líder / Fundador:** Santiago Gutiérrez\n` +
        `• 💼 **Equipo Directivo y Operativo:**\n` +
        `   - Samuel Páez\n` +
        `   - Daniel Páez\n` +
        `   - Jostin González\n\n` +
        `Un equipo apasionado y enfocado en transformar el futuro del comercio digital para los jóvenes.`,
      chips: ["📞 Contactar con Santiago", "🌟 Sobre PayNex", "🛍️ Tienda"]
    },
    {
      keywords: ["producto painex", "producto paynex", "productos painex", "productos paynex", "informacion painex", "informacion paynex", "informacion del producto"],
      response: `✨ **Información Integral de PayNex**:\n\n` +
        `• **Plataforma / Producto:** Ecosistema tecnológico de mediación y logística e-commerce para jóvenes emprendedores.\n` +
        `• **Catálogo Disponible:** iPhone 15 Pro, calzado deportivo urbano, smartwatches, perfumes y accesorios.\n` +
        `• **Seguridad Garantizada:** Compra protegida, respaldo antifraude y garantía de satisfacción.\n` +
        `• **Contacto Oficial:** WhatsApp y teléfono al [${BOT_CONFIG.supportWhatsappFormatted}](https://wa.me/${BOT_CONFIG.supportWhatsapp}) o correo [${BOT_CONFIG.supportEmail}](mailto:${BOT_CONFIG.supportEmail}).\n\n` +
        `¿Deseas ver la tienda online o saber cómo empezar a vender?`,
      chips: ["🏬 Ver Tienda", "📞 Contactar Asesor", "🚀 ¿Cómo Vender?"]
    },
    {
      keywords: ["productos", "catalogo", "articulos", "que venden", "precios", "tienda", "disponibles", "comprar productos", "que productos tienen"],
      response: `🛍️ **Catálogo y Productos Destacados en PayNex:**\n\n` +
        `• 📱 **iPhone 15 Pro** - Tecnología | **$1.250.000 COP** *(Más vendido)*\n` +
        `• 👟 **Tenis Deportivos** - Moda | **$180.000 COP** *(Excelente calidad)*\n` +
        `• ⌚ **Smartwatch Serie 8** - Tecnología | **$250.000 COP**\n` +
        `• 🌸 **Perfume L'Essence** - Belleza | **$135.000 COP**\n` +
        `• 🎒 **Morral Urbano** - Accesorios | **$90.000 COP**\n\n` +
        `Puedes ver todos los detalles, filtrar por categorías y pedir directamente en nuestra tienda.`,
      chips: ["🏬 Ir a la Tienda", "💳 Métodos de Pago", "📦 Envíos"]
    },
    {
      keywords: ["iphone", "celular", "telefono movil"],
      response: `📱 **iPhone 15 Pro en PayNex**:\n` +
        `• **Precio:** $1.250.000 COP\n` +
        `• **Garantía:** 12 meses oficial\n` +
        `• **Envío:** Gratis a nivel nacional\n` +
        `• **Vendedor:** Verificado por PayNex\n\n` +
        `¿Deseas explorar este y otros artículos en la tienda?`,
      chips: ["🏬 Ir a la Tienda", "📞 Contactar Asesor"]
    },
    {
      keywords: ["tenis", "zapatos", "calzado", "sneakers"],
      response: `👟 **Tenis Deportivos Urbanos**:\n` +
        `• **Precio:** $180.000 COP\n` +
        `• **Tallas:** 36 a 43 disponibles\n` +
        `• **Material:** Suela ergonómica de alto impacto y tela transpirable\n` +
        `• **Envío:** A todo el país`,
      chips: ["🏬 Ir a la Tienda", "📦 Tiempos de Entrega"]
    },
    {
      keywords: ["smartwatch", "reloj", "serie 8"],
      response: `⌚ **Smartwatch Serie 8**:\n` +
        `• **Precio:** $250.000 COP\n` +
        `• **Funciones:** Monitor cardíaco, notificaciones WhatsApp, resistente al agua y batería de larga duración.`,
      chips: ["🏬 Ir a la Tienda", "🛡️ Garantía"]
    },
    {
      keywords: ["vender", "emprender", "vendedor", "publicar", "como vendo", "ganar dinero", "comisiones", "subir producto", "mi negocio"],
      response: `🚀 **¿Cómo empezar a vender en PayNex?**\n\n` +
        `1️⃣ **Regístrate:** Crea tu cuenta en minutos en [login.html#register](login.html#register).\n` +
        `2️⃣ **Entra a tu Panel:** Ve a la sección *"Mis ventas"* en tu panel de control.\n` +
        `3️⃣ **Publica tus productos:** Sube fotos, descripción, precio y stock.\n` +
        `4️⃣ **Recibe pedidos y pagos:** Notificamos cada venta y recibes tus ganancias sin complicaciones.\n\n` +
        `¡No necesitas experiencia previa ni cuentas bancarias complejas! PayNex está diseñado para mediar y proteger tu talento.`,
      chips: ["📝 Registrarme Gratis", "📞 Soporte a Vendedores", "💳 Pagos y Retiros"]
    },
    {
      keywords: ["comprar", "como compro", "hacer pedido", "carrito", "adquirir", "orden"],
      response: `🛒 **¿Cómo comprar en PayNex?**\n\n` +
        `1. Navega por la [Tienda / Catálogo](dashboard.html).\n` +
        `2. Selecciona el producto que más te guste.\n` +
        `3. Haz clic en comprar o agrégalo a tu lista.\n` +
        `4. Ingresa tus datos de envío y elige tu método de pago.\n` +
        `5. ¡Listo! Recibirás la guía de seguimiento para rastrear tu paquete.`,
      chips: ["🏬 Explorar Tienda", "💳 Métodos de Pago", "🛡️ Compras Seguras"]
    },
    {
      keywords: ["seguridad", "seguro", "confiable", "estafa", "garantia", "fraude", "devolucion", "protegido", "confianza"],
      response: `🛡️ **Compras y Ventas 100% Seguras en PayNex**:\n\n` +
        `• **Compra Protegida:** Tu dinero se resguarda hasta que recibes tu producto a conformidad.\n` +
        `• **Vendedores Verificados:** Validamos la identidad de cada emprendedor.\n` +
        `• **Transacciones Encriptadas:** Certificado SSL y pasarela de pago segura de estándar bancario.\n` +
        `• **Garantía de Devolución:** 10 días para solicitar cambio o reembolso si no coincide con lo ofrecido.`,
      chips: ["📦 Envíos Seguros", "📞 Soporte", "🛍️ Ver Productos"]
    },
    {
      keywords: ["envio", "envios", "domicilio", "entrega", "cuanto demora", "tiempo de entrega", "transportadora", "ciudades", "bogota", "medellin", "cali"],
      response: `📦 **Política de Envíos PayNex**:\n\n` +
        `• **Cobertura:** Despachamos a todas las ciudades y municipios del país 🇨🇴.\n` +
        `• **Tiempos de entrega:**\n` +
        `   - Ciudades principales: **2 a 4 días hábiles**\n` +
        `   - Otras zonas: **3 a 6 días hábiles**\n` +
        `• **Rastreo:** Podrás seguir tu paquete en tiempo real con número de guía en la sección *"Mis compras"*.\n` +
        `• **Aliados:** Coordinadora, Servientrega e Interrapidísimo.`,
      chips: ["🛍️ Comprar Ahora", "🛡️ Compras Seguras", "📞 Preguntar por un Pedido"]
    },
    {
      keywords: ["pago", "pagos", "metodos de pago", "tarjeta", "nequi", "daviplata", "pse", "efectivo", "bancolombia"],
      response: `💳 **Métodos de Pago Disponibles**:\n\n` +
        `Aceptamos múltiples opciones para tu comodidad:\n` +
        `• **Billeteras Digitales:** Nequi y Daviplata\n` +
        `• **PSE:** Transferencia desde cualquier banco colombiano\n` +
        `• **Tarjetas:** Crédito y Débito (Visa, Mastercard, Amex)\n` +
        `• **Saldo PayNex:** Si vendes, puedes usar tus ganancias para comprar directamente.`,
      chips: ["🛡️ Seguridad de Pagos", "🏬 Ir a la Tienda"]
    },
    {
      keywords: ["registro", "cuenta", "iniciar sesion", "login", "registrarse", "olvide mi contraseña", "olvide clave", "acceder"],
      response: `🔑 **Gestión de Cuenta PayNex**:\n\n` +
        `• Para iniciar sesión: [login.html](login.html)\n` +
        `• Para crear una cuenta nueva: [login.html#register](login.html#register)\n` +
        `• Si olvidaste tu contraseña, desde la pantalla de login puedes restablecerla con tu correo electrónico.`,
      chips: ["🔑 Iniciar Sesión", "📝 Registrarme", "📞 Ayuda con mi Cuenta"]
    },
    {
      keywords: ["gracias", "muchas gracias", "vale", "perfecto", "genial", "listo", "ok", "excelente"],
      response: `¡Con mucho gusto! 😊 En **PayNex** creemos firmemente en el talento de los jóvenes. Si tienes más dudas, contáctanos al WhatsApp **${BOT_CONFIG.supportPhoneFormatted}** o al correo **${BOT_CONFIG.supportEmail}**. ¡Muchos éxitos! ✨`,
      chips: ["📞 Contactar Asesor", "🛍️ Ver Productos", "🚀 Emprender"]
    },
    {
      keywords: ["adios", "chao", "hasta luego", "bye"],
      response: `¡Hasta luego! Recuerda que estoy aquí 24/7 para asistirte en **PayNex**. ¡Mucho éxito en tus compras y emprendimientos! 👋`,
      chips: ["Reiniciar conversación"]
    }
  ];

  // Respuesta por defecto cuando no se reconoce la intención
  const DEFAULT_FALLBACK = {
    response: `Disculpa, no entendí completamente tu mensaje. 🤔\n\n¿Podrías elegir uno de los siguientes temas o comunicarte directamente con nosotros al WhatsApp **${BOT_CONFIG.supportPhoneFormatted}**?`,
    chips: ["📞 Contacto y Soporte", "🌟 ¿Qué es PayNex?", "🛍️ Catálogo de Productos", "🚀 ¿Cómo Vender?"]
  };

  // Sanitizador de texto contra XSS (Seguridad de primera categoría)
  function escapeHTML(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Parseador seguro de Markdown básico para respuestas del Bot
  // Solamente interpreta **negrita**, enlaces seguros y saltos de línea.
  function formatBotMessage(text) {
    // 1. Escapar HTML para neutralizar cualquier script malicioso
    let safe = escapeHTML(text);

    // 2. Formato **negrita**
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 3. Formato *cursiva*
    safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 4. Formato de enlaces seguros: [texto](url)
    safe = safe.replace(/\[(.*?)\]\((.*?)\)/g, function (match, linkText, url) {
      const cleanUrl = url.trim();
      // Validar protocolos seguros
      const isSafeProtocol = /^(https?:\/\/|mailto:|tel:|#[a-zA-Z0-9_-]+|[a-zA-Z0-9_\-\.\/]+\.html)/i.test(cleanUrl);
      if (!isSafeProtocol) {
        return linkText; // Si no es seguro, muestra solo el texto
      }
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    });

    // 5. Saltos de línea
    safe = safe.replace(/\n/g, "<br>");

    return safe;
  }

  // Normalizador de texto para búsqueda de intenciones (remueve tildes, signos, minúsculas)
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remueve tildes
      .replace(/[¿?¡!.,:;()_\-]/g, " ") // Reemplaza puntuación por espacios
      .trim();
  }

  // Motor de respuesta del Chatbot
  function findBestMatch(userQuery) {
    const normalized = normalizeText(userQuery);

    if (!normalized) {
      return {
        response: `¡Hola! Por favor escribe tu duda o consulta sobre **PayNex** para poder ayudarte.`,
        chips: ["📞 Contacto", "🛍️ Productos", "🚀 ¿Cómo Vender?"]
      };
    }

    // Comprobación de palabras clave con sistema de puntuación
    let bestMatch = null;
    let highestScore = 0;

    for (const item of KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        const normKw = normalizeText(kw);
        if (normalized === normKw) {
          score += 10;
        } else if (normalized.includes(normKw)) {
          score += 4 + (normKw.length / 5);
        } else {
          // Búsqueda por token individual
          const words = normKw.split(/\s+/);
          const matchCount = words.filter(w => normalized.includes(w) && w.length > 2).length;
          if (matchCount === words.length && words.length > 0) {
            score += 3 * matchCount;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && highestScore > 0) {
      return bestMatch;
    }

    return DEFAULT_FALLBACK;
  }

  // Generador de audio de notificación sutil (Web Audio API - Cero dependencias)
  let audioCtx = null;
  function playBeepSound(isMuted) {
    if (isMuted) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Ignorar si el navegador bloquea audio sin interacción previa
    }
  }

  // Clase Principal del Chatbot
  class PayNexChatbot {
    constructor() {
      this.isOpen = false;
      this.isTyping = false;
      this.isMuted = localStorage.getItem(BOT_CONFIG.storageMuteKey) === "true";
      this.unreadCount = 0;
      this.messages = [];
      this.init();
    }

    init() {
      // Esperar a que el DOM esté listo
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.buildUI());
      } else {
        this.buildUI();
      }
    }

    buildUI() {
      // Evitar doble inicialización
      if (document.getElementById("pnChatContainer")) return;

      // Si la página cuenta con una sidebar fija lateral, marcar el body
      if (document.querySelector(".sidebar")) {
        document.body.classList.add("has-sidebar");
      }

      // Crear contenedor flotante
      const container = document.createElement("div");
      container.id = "pnChatContainer";
      container.className = "pn-chat-container";
      container.setAttribute("role", "complementary");
      container.setAttribute("aria-label", "Asistente Virtual PayNex");

      // Inyectar HTML estructural del Widget
      container.innerHTML = `
        <!-- Tooltip de bienvenida -->
        <div class="pn-chat-tooltip" id="pnChatTooltip">
          <span>👋 ¡Hola! ¿Necesitas ayuda con <strong>PayNex</strong>?</span>
        </div>

        <!-- Botón Disparador Flotante (Launcher) -->
        <button class="pn-chat-launcher" id="pnChatLauncher" aria-label="Abrir asistente de ayuda" title="Chat de ayuda PayNex">
          <div class="pn-chat-pulse"></div>
          
          <!-- Icono Abrir (Robot/Mensaje) -->
          <div class="pn-icon-open">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>

          <!-- Icono Cerrar (X) -->
          <div class="pn-icon-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>

          <!-- Badge de mensajes no leídos -->
          <span class="pn-chat-badge hidden" id="pnChatBadge">0</span>
        </button>

        <!-- Ventana del Chat -->
        <section class="pn-chat-window" id="pnChatWindow" aria-hidden="true">
          <!-- Cabecera -->
          <header class="pn-chat-header">
            <div class="pn-chat-header-profile">
              <div class="pn-chat-avatar-wrap">
                <img src="${BOT_CONFIG.avatarImg}" alt="${BOT_CONFIG.botName}" class="pn-chat-avatar-img">
                <span class="pn-chat-status-dot" title="En línea"></span>
              </div>
              <div class="pn-chat-header-info">
                <span class="pn-chat-title">
                  ${BOT_CONFIG.botTitle}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8" stroke="currentColor" stroke-width="0">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </span>
                <span class="pn-chat-subtitle">${BOT_CONFIG.botStatus}</span>
              </div>
            </div>

            <!-- Acciones de Cabecera -->
            <div class="pn-chat-header-actions">
              <!-- Mute / Sonido -->
              <button class="pn-chat-btn-action" id="pnBtnMute" title="${this.isMuted ? 'Activar sonido' : 'Silenciar sonido'}" aria-label="Alternar sonido">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="pnMuteIcon">
                  ${this.getSoundIconSvg()}
                </svg>
              </button>

              <!-- Reiniciar chat -->
              <button class="pn-chat-btn-action" id="pnBtnReset" title="Reiniciar chat" aria-label="Reiniciar conversación">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M8 16H3v5"></path>
                </svg>
              </button>

              <!-- Minimizar -->
              <button class="pn-chat-btn-action" id="pnBtnClose" title="Cerrar chat" aria-label="Cerrar ventana">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </header>

          <!-- Banner Informativo -->
          <div class="pn-chat-welcome-banner">
            <span>⚡ <strong>PayNex:</strong> Ayuda y Emprendimiento Juvenil</span>
            <a href="https://wa.me/${BOT_CONFIG.supportWhatsapp}?text=Hola%20Santiago,%20solicito%20asistencia%20en%20PayNex" target="_blank" rel="noopener noreferrer" style="color: #16a34a; font-weight:700; text-decoration:none; display:flex; align-items:center; gap:3px;">
              <span>WhatsApp (${BOT_CONFIG.supportPhone})</span> ↗
            </a>
          </div>

          <!-- Área de Mensajes -->
          <div class="pn-chat-messages" id="pnChatMessages" role="log" aria-live="polite">
            <!-- Los mensajes se renderizan dinámicamente -->
          </div>

          <!-- Sugerencias rápidas (Chips) -->
          <div class="pn-chat-suggestions" id="pnChatSuggestions">
            <!-- Chips dinámicos -->
          </div>

          <!-- Formulario de entrada -->
          <footer class="pn-chat-footer">
            <form class="pn-chat-input-form" id="pnChatForm" autocomplete="off">
              <input 
                type="text" 
                id="pnChatInput" 
                class="pn-chat-input" 
                placeholder="Escribe tu pregunta sobre PayNex..." 
                maxlength="${BOT_CONFIG.maxInputChars}"
                aria-label="Mensaje para el asistente"
              />
              <button type="submit" class="pn-chat-btn-send" id="pnBtnSend" aria-label="Enviar mensaje">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <div class="pn-chat-subtext">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              PayNex Seguro • Compra, vende y emprende
            </div>
          </footer>
        </section>
      `;

      document.body.appendChild(container);

      // Referencias a elementos
      this.dom = {
        container,
        launcher: document.getElementById("pnChatLauncher"),
        window: document.getElementById("pnChatWindow"),
        messages: document.getElementById("pnChatMessages"),
        suggestions: document.getElementById("pnChatSuggestions"),
        form: document.getElementById("pnChatForm"),
        input: document.getElementById("pnChatInput"),
        btnSend: document.getElementById("pnBtnSend"),
        btnClose: document.getElementById("pnBtnClose"),
        btnReset: document.getElementById("pnBtnReset"),
        btnMute: document.getElementById("pnBtnMute"),
        muteIcon: document.getElementById("pnMuteIcon"),
        badge: document.getElementById("pnChatBadge"),
        tooltip: document.getElementById("pnChatTooltip")
      };

      // Registrar eventos
      this.attachEvents();

      // Cargar historial previo o mensaje de bienvenida
      this.loadHistory();

      // Mostrar un tooltip agradable a los 3 segundos si no se ha abierto
      setTimeout(() => {
        if (!this.isOpen && this.dom.tooltip) {
          this.dom.tooltip.classList.add("show-auto");
          setTimeout(() => {
            if (this.dom.tooltip) this.dom.tooltip.classList.remove("show-auto");
          }, 6000);
        }
      }, 3500);
    }

    getSoundIconSvg() {
      if (this.isMuted) {
        // Icono Silenciado
        return `
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        `;
      } else {
        // Icono Sonido activo
        return `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
      }
    }

    attachEvents() {
      // Toggle Launcher
      this.dom.launcher.addEventListener("click", () => this.toggleChat());

      // Botón Cerrar
      this.dom.btnClose.addEventListener("click", () => this.closeChat());

      // Botón Reset
      this.dom.btnReset.addEventListener("click", () => {
        if (confirm("¿Deseas reiniciar la conversación con Nexy?")) {
          this.resetChat();
        }
      });

      // Botón Sonido
      this.dom.btnMute.addEventListener("click", () => {
        this.isMuted = !this.isMuted;
        localStorage.setItem(BOT_CONFIG.storageMuteKey, this.isMuted ? "true" : "false");
        this.dom.muteIcon.innerHTML = this.getSoundIconSvg();
        this.dom.btnMute.title = this.isMuted ? "Activar sonido" : "Silenciar sonido";
      });

      // Enviar formulario
      this.dom.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleUserSubmit();
      });

      // Cerrar con Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isOpen) {
          this.closeChat();
        }
      });
    }

    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    openChat() {
      this.isOpen = true;
      this.dom.container.classList.add("active");
      this.dom.window.setAttribute("aria-hidden", "false");
      this.unreadCount = 0;
      this.updateBadge();

      if (this.dom.tooltip) {
        this.dom.tooltip.classList.remove("show-auto");
      }

      // Enfocar input en desktop
      if (window.innerWidth > 640) {
        setTimeout(() => this.dom.input.focus(), 300);
      }

      this.scrollToBottom();
    }

    closeChat() {
      this.isOpen = false;
      this.dom.container.classList.remove("active");
      this.dom.window.setAttribute("aria-hidden", "true");
    }

    updateBadge() {
      if (this.unreadCount > 0 && !this.isOpen) {
        this.dom.badge.textContent = this.unreadCount > 9 ? "9+" : this.unreadCount;
        this.dom.badge.classList.remove("hidden");
      } else {
        this.dom.badge.classList.add("hidden");
      }
    }

    scrollToBottom() {
      setTimeout(() => {
        this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
      }, 50);
    }

    formatTime(date) {
      const d = date ? new Date(date) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    appendMessageToDOM(msg) {
      const row = document.createElement("div");
      row.className = `pn-msg-row ${msg.sender === "bot" ? "pn-msg-bot" : "pn-msg-user"}`;

      if (msg.sender === "bot") {
        const avatar = document.createElement("img");
        avatar.className = "pn-msg-avatar";
        avatar.src = BOT_CONFIG.avatarImg;
        avatar.alt = BOT_CONFIG.botName;
        row.appendChild(avatar);
      }

      const bubbleWrap = document.createElement("div");
      bubbleWrap.style.display = "flex";
      bubbleWrap.style.flexDirection = "column";

      const bubble = document.createElement("div");
      bubble.className = "pn-msg-bubble";

      if (msg.sender === "user") {
        // SEGURIDAD MÁXIMA: El mensaje del usuario NUNCA se procesa como HTML
        bubble.textContent = msg.text;
      } else {
        // El mensaje del bot pasa por nuestro parser seguro de Markdown
        bubble.innerHTML = formatBotMessage(msg.text);

        // Si la respuesta incluye botones de acción específicos (WhatsApp, Catálogo, etc.)
        if (msg.actionButtons && msg.actionButtons.length > 0) {
          const actionsDiv = document.createElement("div");
          actionsDiv.style.marginTop = "8px";
          actionsDiv.style.display = "flex";
          actionsDiv.style.flexWrap = "wrap";

          msg.actionButtons.forEach(btn => {
            const a = document.createElement("a");
            a.className = `pn-chat-action-btn ${btn.type || ''}`;
            a.href = btn.url;
            if (btn.target) a.target = btn.target;
            a.rel = "noopener noreferrer";
            a.innerHTML = `${btn.icon || ''} ${escapeHTML(btn.text)}`;
            actionsDiv.appendChild(a);
          });

          bubble.appendChild(actionsDiv);
        }
      }

      const timeSpan = document.createElement("span");
      timeSpan.className = "pn-msg-time";
      timeSpan.textContent = this.formatTime(msg.timestamp);

      bubbleWrap.appendChild(bubble);
      bubbleWrap.appendChild(timeSpan);
      row.appendChild(bubbleWrap);

      this.dom.messages.appendChild(row);
      this.scrollToBottom();
    }

    renderSuggestions(chips) {
      this.dom.suggestions.innerHTML = "";
      if (!chips || chips.length === 0) return;

      chips.forEach(chipText => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pn-chip";
        btn.textContent = chipText;
        btn.addEventListener("click", () => {
          this.handleQuickChip(chipText);
        });
        this.dom.suggestions.appendChild(btn);
      });
    }

    handleQuickChip(text) {
      if (text.includes("WhatsApp") || text.includes("Hablar con Santiago") || text.includes("Contactar con Santiago")) {
        window.open(`https://wa.me/${BOT_CONFIG.supportWhatsapp}?text=Hola%20Santiago,%20tengo%20una%20consulta%20sobre%20PayNex`, "_blank", "noopener,noreferrer");
        return;
      }
      if (text.includes("Llamar")) {
        window.location.href = `tel:${BOT_CONFIG.supportPhone}`;
        return;
      }
      if (text.includes("correo") || text.includes("Email")) {
        window.location.href = `mailto:${BOT_CONFIG.supportEmail}?subject=Consulta%20PayNex`;
        return;
      }
      if (text.includes("Ir a la Tienda") || text.includes("Catálogo") || text.includes("Ver Tienda") || text.includes("Tienda")) {
        window.location.href = "dashboard.html";
        return;
      }
      if (text.includes("Registrarme") || text.includes("Empezar a Vender")) {
        window.location.href = "login.html#register";
        return;
      }
      if (text.includes("Iniciar Sesión")) {
        window.location.href = "login.html";
        return;
      }
      if (text.includes("Reiniciar conversación")) {
        this.resetChat();
        return;
      }

      // Enviar como mensaje del usuario
      this.processUserMessage(text);
    }

    handleUserSubmit() {
      const rawText = this.dom.input.value.trim();
      if (!rawText || this.isTyping) return;

      // Limitar longitud
      const cleanText = rawText.substring(0, BOT_CONFIG.maxInputChars);
      this.dom.input.value = "";
      this.processUserMessage(cleanText);
    }

    processUserMessage(userText) {
      if (this.isTyping) return;

      // 1. Agregar mensaje de usuario
      const userMsg = {
        sender: "user",
        text: userText,
        timestamp: new Date().toISOString()
      };
      this.messages.push(userMsg);
      this.appendMessageToDOM(userMsg);
      this.saveHistory();

      // 2. Mostrar indicador de escribiendo
      this.showTypingIndicator();

      // 3. Procesar respuesta inteligente
      setTimeout(() => {
        this.hideTypingIndicator();

        const match = findBestMatch(userText);

        // Acciones interactivas complementarias según el tipo de respuesta
        let actionButtons = [];
        const lowerQuery = userText.toLowerCase();

        if (lowerQuery.includes("contacto") || lowerQuery.includes("whatsapp") || lowerQuery.includes("telefono") || lowerQuery.includes("correo") || lowerQuery.includes("llamar") || lowerQuery.includes("santiago")) {
          actionButtons.push({
            text: `WhatsApp (+57 ${BOT_CONFIG.supportPhone})`,
            url: `https://wa.me/${BOT_CONFIG.supportWhatsapp}?text=Hola%20Santiago,%20solicito%20asistencia%20en%20PayNex`,
            target: "_blank",
            type: "whatsapp",
            icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.053-1.042-.08-.26-.084-.593-.207-1.026-.395-1.834-.798-3.033-2.656-3.125-2.778-.092-.122-.746-.994-.746-1.896 0-.903.473-1.346.641-1.528.169-.182.368-.228.49-.228.123 0 .245.002.352.007.112.006.262-.042.41.312.152.365.518 1.264.563 1.356.046.091.077.198.016.319-.061.122-.092.198-.184.305-.091.107-.193.24-.275.322-.093.092-.19.192-.082.378.107.183.478.788 1.026 1.275.706.629 1.301.823 1.485.914.184.092.291.076.398-.046.108-.122.46-.534.582-.717.123-.183.246-.153.414-.092.169.061 1.073.506 1.257.598.184.092.307.137.352.213.046.076.046.442-.098.847z"/></svg>`
          });
          actionButtons.push({
            text: `Llamar al ${BOT_CONFIG.supportPhone}`,
            url: `tel:${BOT_CONFIG.supportPhone}`,
            target: "_self",
            icon: "📞"
          });
          actionButtons.push({
            text: "Enviar Correo",
            url: `mailto:${BOT_CONFIG.supportEmail}?subject=Contacto%20PayNex`,
            target: "_self",
            icon: "✉️"
          });
        } else if (lowerQuery.includes("producto") || lowerQuery.includes("catalogo") || lowerQuery.includes("tienda") || lowerQuery.includes("comprar")) {
          actionButtons.push({
            text: "Ver Tienda Completa",
            url: "dashboard.html",
            target: "_self",
            icon: "🛍️"
          });
        } else if (lowerQuery.includes("vender") || lowerQuery.includes("emprender") || lowerQuery.includes("registro")) {
          actionButtons.push({
            text: "Crear Cuenta de Emprendedor",
            url: "login.html#register",
            target: "_self",
            icon: "🚀"
          });
        }

        const botMsg = {
          sender: "bot",
          text: match.response,
          actionButtons: actionButtons,
          timestamp: new Date().toISOString()
        };

        this.messages.push(botMsg);
        this.appendMessageToDOM(botMsg);
        this.renderSuggestions(match.chips || []);
        this.saveHistory();

        // Sonido de notificación
        playBeepSound(this.isMuted);

        // Si el chat está cerrado, aumentar contador de no leídos
        if (!this.isOpen) {
          this.unreadCount++;
          this.updateBadge();
        }
      }, BOT_CONFIG.typingDelayMs);
    }

    showTypingIndicator() {
      this.isTyping = true;
      this.dom.btnSend.disabled = true;

      const typingDiv = document.createElement("div");
      typingDiv.className = "pn-msg-row pn-msg-bot";
      typingDiv.id = "pnTypingRow";

      const avatar = document.createElement("img");
      avatar.className = "pn-msg-avatar";
      avatar.src = BOT_CONFIG.avatarImg;
      avatar.alt = BOT_CONFIG.botName;

      const bubble = document.createElement("div");
      bubble.className = "pn-typing-bubble";
      bubble.innerHTML = `
        <span class="pn-typing-dot"></span>
        <span class="pn-typing-dot"></span>
        <span class="pn-typing-dot"></span>
      `;

      typingDiv.appendChild(avatar);
      typingDiv.appendChild(bubble);
      this.dom.messages.appendChild(typingDiv);
      this.scrollToBottom();
    }

    hideTypingIndicator() {
      this.isTyping = false;
      this.dom.btnSend.disabled = false;
      const el = document.getElementById("pnTypingRow");
      if (el) el.remove();
    }

    saveHistory() {
      try {
        // Guardar únicamente los últimos 25 mensajes para mantener el almacenamiento ligero y seguro
        const sliced = this.messages.slice(-25);
        localStorage.setItem(BOT_CONFIG.storageKey, JSON.stringify(sliced));
      } catch (e) {
        // En caso de cuota excedida en localStorage
      }
    }

    loadHistory() {
      try {
        const saved = localStorage.getItem(BOT_CONFIG.storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.messages = parsed;
            this.messages.forEach(msg => this.appendMessageToDOM(msg));
            this.renderSuggestions(["📞 Contacto", "🛍️ Productos", "🚀 ¿Cómo Vender?", "🛡️ Seguridad y Pagos"]);
            return;
          }
        }
      } catch (e) {
        this.messages = [];
      }

      // Si no hay historial, enviar mensaje de bienvenida inicial
      const welcomeMsg = {
        sender: "bot",
        text: `¡Hola! Bienvenido a **PayNex** 👋 Soy **${BOT_CONFIG.botName}**, tu asistente virtual.\n\n` +
              `Somos la plataforma tecnológica de **logística e-commerce y mediación para que jóvenes y menores de edad puedan emprender y generar ingresos** con total seguridad.\n\n` +
              `📞 **Contacto Directo:** WhatsApp / Tel al [**${BOT_CONFIG.supportPhoneFormatted}**](https://wa.me/${BOT_CONFIG.supportWhatsapp}) o al correo [**${BOT_CONFIG.supportEmail}**](mailto:${BOT_CONFIG.supportEmail}).\n\n` +
              `¿En qué te gustaría que te ayude hoy?`,
        timestamp: new Date().toISOString()
      };
      this.messages.push(welcomeMsg);
      this.appendMessageToDOM(welcomeMsg);
      this.renderSuggestions(["📞 Contacto Directo", "🌟 ¿Qué es PayNex?", "🛍️ Ver Productos", "🚀 ¿Cómo Vender?"]);
      this.saveHistory();
    }

    resetChat() {
      localStorage.removeItem(BOT_CONFIG.storageKey);
      this.messages = [];
      this.dom.messages.innerHTML = "";
      this.unreadCount = 0;
      this.updateBadge();
      this.loadHistory();
    }
  }

  // Inicializar automáticamente cuando el script se cargue
  window.PayNexChat = new PayNexChatbot();

})();
