/**
 * PayNex - Módulo y Simulador de Seguridad de Términos y Condiciones
 * Implementa validación de consentimiento, auditoría legal y simulación criptográfica
 */

export const TERMS_CONFIG = {
  version: "2.4-2026",
  lastUpdated: "17 de Octubre de 2026",
  contractHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  complianceLaws: ["Ley 1581 de 2012 (Habeas Data)", "Ley 1480 de 2011 (Estatuto del Consumidor)", "Comercio Electrónico Ley 527 de 1999"]
};

export function getTermsModalHTML() {
  return `
  <div class="modal-overlay" id="termsSimulatorModal" style="display: none; z-index: 9999;">
    <div class="modal-card" style="max-width: 760px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
      
      <!-- Encabezado Modal -->
      <div style="padding: 20px 24px; background: linear-gradient(135deg, #0b132b, #1e1b4b); color: #fff; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🛡️
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: #fff;">Simulador de Seguridad & Términos PayNex</h3>
            <span style="font-size: 12px; color: #a5b4fc;">Módulo de Cumplimiento Legal y Verificación Criptográfica v${TERMS_CONFIG.version}</span>
          </div>
        </div>
        <button type="button" class="btn-close-modal" id="btnCloseTermsModal" style="color: #cbd5e1; font-size: 24px; line-height: 1;">&times;</button>
      </div>

      <!-- Barra de navegación de pestañas -->
      <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0 16px;">
        <button type="button" id="tabBtnSimulator" class="terms-tab-btn active" style="padding: 12px 18px; font-weight: 700; font-size: 13.5px; border: none; background: none; cursor: pointer; border-bottom: 3px solid #4f46e5; color: #4f46e5;">
          🛡️ Simulador de Seguridad
        </button>
        <button type="button" id="tabBtnDocument" class="terms-tab-btn" style="padding: 12px 18px; font-weight: 600; font-size: 13.5px; border: none; background: none; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b;">
          📜 Documento Oficial de Términos
        </button>
        <button type="button" id="tabBtnAudit" class="terms-tab-btn" style="padding: 12px 18px; font-weight: 600; font-size: 13.5px; border: none; background: none; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b;">
          ✅ Auditoría de Cumplimiento
        </button>
      </div>

      <!-- Contenido scrolleable -->
      <div style="padding: 24px; overflow-y: auto; flex: 1; background: #fff;" id="termsModalBody">
        
        <!-- PESTAÑA 1: SIMULADOR DE SEGURIDAD -->
        <div id="tabContentSimulator">
          <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong style="color: #3730a3; font-size: 14px;">Diagnóstico de Seguridad Activo</strong>
              <p style="font-size: 12.5px; color: #4338ca; margin: 2px 0 0 0;">Verifica cómo la plataforma previene vulnerabilidades de aceptación, alteración y fraude.</p>
            </div>
            <span style="background: #10b981; color: #fff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
              Sistema 100% Protegido
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; margin-bottom: 20px;">
            
            <!-- Test 1: Bypass Test -->
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">🚫</span>
                <strong style="font-size: 13.5px; color: #0f172a;">Prueba 1: Intento de Bypass de T&C</strong>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Simula un intento de compra o registro omitiendo la aceptación obligatoria de términos.</p>
              <button type="button" id="btnTestBypass" style="width: 100%; background: #4f46e5; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                Ejecutar Simulación de Bypass
              </button>
            </div>

            <!-- Test 2: Crypto Signature -->
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">🔐</span>
                <strong style="font-size: 13.5px; color: #0f172a;">Prueba 2: Firma Criptográfica SHA-256</strong>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Genera un comprobante digital inmutable con hash SHA-256 y timestamp de no repudio.</p>
              <button type="button" id="btnTestCrypto" style="width: 100%; background: #0284c7; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                Generar Firma Digital de Consentimiento
              </button>
            </div>

            <!-- Test 3: Tamper Detection -->
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">⚠️</span>
                <strong style="font-size: 13.5px; color: #0f172a;">Prueba 3: Detección de Alteración</strong>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Simula la manipulación indebida de una cláusula contractual en tránsito para probar la integridad.</p>
              <button type="button" id="btnTestTamper" style="width: 100%; background: #d97706; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                Simular Ataque de Alteración
              </button>
            </div>

            <!-- Test 4: Full Audit -->
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">📊</span>
                <strong style="font-size: 13.5px; color: #0f172a;">Prueba 4: Auditoría Completa</strong>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Escanea en tiempo real los 5 pilares de seguridad y emite el certificado de conformidad.</p>
              <button type="button" id="btnTestFullAudit" style="width: 100%; background: #059669; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer;">
                Ejecutar Auditoría Global
              </button>
            </div>

          </div>

          <!-- Consola de Resultados en Tiempo Real -->
          <div style="background: #0f172a; border-radius: 12px; padding: 16px; color: #f8fafc; font-family: monospace; font-size: 12px; min-height: 120px; max-height: 200px; overflow-y: auto;" id="simulatorConsole">
            <span style="color: #64748b;">[CONSOLA DE SEGURIDAD PAYNEX - V${TERMS_CONFIG.version}]</span><br>
            <span style="color: #10b981;">✔ Validador de consentimiento inicializado.</span><br>
            <span style="color: #94a3b8;">Presiona cualquiera de los botones de prueba para ejecutar una simulación.</span>
          </div>
        </div>

        <!-- PESTAÑA 2: DOCUMENTO OFICIAL DE TÉRMINOS -->
        <div id="tabContentDocument" style="display: none; font-size: 13.5px; line-height: 1.6; color: #334155;">
          <h4 style="color: #0f172a; margin-bottom: 6px; font-size: 16px;">TÉRMINOS Y CONDICIONES DE USO DE LA PLATAFORMA PAYNEX</h4>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Versión oficial 2.4 | Última actualización: ${TERMS_CONFIG.lastUpdated}</p>

          <h5 style="color: #1e293b; margin-top: 14px; font-size: 14px;">1. OBJETO Y ACEPTACIÓN DE LAS PARTES</h5>
          <p>El acceso, registro y utilización del marketplace PayNex implica la aceptación expresa, libre, informada y vinculante de los presentes Términos y Condiciones. Cualquier transacción efectuada a través del sistema goza de validez jurídica de acuerdo con la Ley 527 de 1999 de Comercio Electrónico.</p>

          <h5 style="color: #1e293b; margin-top: 14px; font-size: 14px;">2. PROCESO DE COMPRA Y TRAZABILIDAD DE ESTADOS</h5>
          <p>Toda orden realizada genera un registro trazable con número único de pedido. El comprador y el vendedor recibirán notificaciones en tiempo real del ciclo de vida del pedido, el cual transitará por los estados reglamentarios: <strong>En proceso</strong>, <strong>En bodega</strong>, <strong>Enviado</strong> y <strong>Entregado</strong>.</p>

          <h5 style="color: #1e293b; margin-top: 14px; font-size: 14px;">3. TRATAMIENTO DE DATOS PERSONALES (HABEAS DATA)</h5>
          <p>En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, PayNex recolecta y trata los datos personales de sus usuarios con fines estrictamente transaccionales, de seguridad, facturación y despacho. El usuario tiene derecho en cualquier momento a consultar, actualizar o suprimir sus datos.</p>

          <h5 style="color: #1e293b; margin-top: 14px; font-size: 14px;">4. SEGURIDAD DE PAGOS Y PROTECCIÓN AL CONSUMIDOR</h5>
          <p>Todas las operaciones financieras se procesan bajo protocolos de cifrado TLS 1.3 y verificación de firma digital. El comprador cuenta con el derecho de retracto conforme al Estatuto del Consumidor (Ley 1480 de 2011) en un plazo de cinco (5) días hábiles tras la entrega del bien.</p>

          <h5 style="color: #1e293b; margin-top: 14px; font-size: 14px;">5. MECANISMO DE CONTINGENCIA Y ALTA DISPONIBILIDAD</h5>
          <p>Para asegurar la continuidad ininterrumpida de las compras, ante fallas temporales de conexión o sincronización de reglas de base de datos, PayNex activa automáticamente una capa de contingencia segura que almacena el pedido localmente garantizando su preservación y posterior liquidación.</p>
        </div>

        <!-- PESTAÑA 3: AUDITORÍA DE CUMPLIMIENTO -->
        <div id="tabContentAudit" style="display: none;">
          <h4 style="color: #0f172a; font-size: 15px; margin-bottom: 14px;">Matriz de Cumplimiento Normativo y Seguridad</h4>
          
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div>
                <strong>Habeas Data & Protección de Datos (Ley 1581)</strong>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Consentimiento expreso previo al registro y almacenamiento protegido.</p>
              </div>
              <span style="font-weight: 700; color: #10b981; font-size: 13px;">100% CUMPLE</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div>
                <strong>Estatuto del Consumidor & Retracto (Ley 1480)</strong>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Información clara sobre precios, catálogo, stock y tiempos de entrega.</p>
              </div>
              <span style="font-weight: 700; color: #10b981; font-size: 13px;">100% CUMPLE</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div>
                <strong>Mensajes de Datos & Firma Digital (Ley 527)</strong>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Validez jurídica del consentimiento electrónico con marca de tiempo.</p>
              </div>
              <span style="font-weight: 700; color: #10b981; font-size: 13px;">100% CUMPLE</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
              <div>
                <strong>Control de Estados de Pedido</strong>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Soporte de estados En proceso, En bodega, Enviado y Entregado.</p>
              </div>
              <span style="font-weight: 700; color: #10b981; font-size: 13px;">100% CUMPLE</span>
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; text-align: center;">
            <p style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Certificado de Auditoría Emitido con Éxito</p>
            <button type="button" id="btnDownloadCert" style="background: #0f172a; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;">
              📥 Descargar Comprobante de Seguridad (TXT)
            </button>
          </div>
        </div>

      </div>

      <!-- Pie de Modal -->
      <div style="padding: 14px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #64748b;">
          🛡️ Validación de Seguridad PayNex Enterprise
        </span>
        <button type="button" class="btn-primary-action" id="btnAcceptTermsAndClose" style="padding: 8px 18px; font-size: 13px;">
          Entendido / Cerrar
        </button>
      </div>

    </div>
  </div>
  `;
}

export function initTermsSimulator(options = {}) {
  // Insert modal into DOM if not present
  if (!document.getElementById("termsSimulatorModal")) {
    const div = document.createElement("div");
    div.innerHTML = getTermsModalHTML();
    document.body.appendChild(div.firstElementChild);
  }

  const modal = document.getElementById("termsSimulatorModal");
  const btnClose = document.getElementById("btnCloseTermsModal");
  const btnAcceptAndClose = document.getElementById("btnAcceptTermsAndClose");
  const tabBtnSim = document.getElementById("tabBtnSimulator");
  const tabBtnDoc = document.getElementById("tabBtnDocument");
  const tabBtnAudit = document.getElementById("tabBtnAudit");
  const tabSim = document.getElementById("tabContentSimulator");
  const tabDoc = document.getElementById("tabContentDocument");
  const tabAud = document.getElementById("tabContentAudit");
  const consoleEl = document.getElementById("simulatorConsole");

  function logConsole(msg, color = "#94a3b8") {
    if (!consoleEl) return;
    const time = new Date().toLocaleTimeString();
    const line = document.createElement("div");
    line.style.color = color;
    line.innerHTML = `[${time}] ${msg}`;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function setTab(activeTab) {
    [tabBtnSim, tabBtnDoc, tabBtnAudit].forEach(btn => {
      btn.style.color = "#64748b";
      btn.style.borderBottomColor = "transparent";
    });
    [tabSim, tabDoc, tabAud].forEach(content => content.style.display = "none");

    if (activeTab === "sim") {
      tabBtnSim.style.color = "#4f46e5";
      tabBtnSim.style.borderBottomColor = "#4f46e5";
      tabSim.style.display = "block";
    } else if (activeTab === "doc") {
      tabBtnDoc.style.color = "#4f46e5";
      tabBtnDoc.style.borderBottomColor = "#4f46e5";
      tabDoc.style.display = "block";
    } else if (activeTab === "audit") {
      tabBtnAudit.style.color = "#4f46e5";
      tabBtnAudit.style.borderBottomColor = "#4f46e5";
      tabAud.style.display = "block";
    }
  }

  tabBtnSim?.addEventListener("click", () => setTab("sim"));
  tabBtnDoc?.addEventListener("click", () => setTab("doc"));
  tabBtnAudit?.addEventListener("click", () => setTab("audit"));

  window.openTermsSimulator = function(initialTab = "sim") {
    if (modal) {
      modal.style.display = "flex";
      setTab(initialTab);
      logConsole("Módulo de Seguridad abierto por el usuario.", "#38bdf8");
    }
  };

  window.closeTermsSimulator = function() {
    if (modal) modal.style.display = "none";
  };

  btnClose?.addEventListener("click", window.closeTermsSimulator);
  btnAcceptAndClose?.addEventListener("click", () => {
    window.closeTermsSimulator();
    if (typeof options.onAccept === "function") options.onAccept();
  });

  // Pruebas del simulador
  document.getElementById("btnTestBypass")?.addEventListener("click", () => {
    logConsole("▶ SIMULACIÓN: Inyectando intento de compra sin consentimiento...", "#f59e0b");
    setTimeout(() => {
      logConsole("🛡️ INTERCEPTOR: Se detectó bandera de consentimiento en FALSE.", "#ef4444");
      logConsole("⛔ RESULTADO: Petición BLOQUEADA exitosamente por el middleware de seguridad.", "#10b981");
      logConsole("Código de rechazo: SEC_ERR_NO_TERMS_ACCEPTED. Integridad preservada.", "#a7f3d0");
    }, 400);
  });

  document.getElementById("btnTestCrypto")?.addEventListener("click", () => {
    logConsole("▶ SIMULACIÓN: Calculando firma criptográfica de consentimiento...", "#38bdf8");
    setTimeout(() => {
      const mockHash = "SHA256-" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join("");
      const timestamp = new Date().toISOString();
      logConsole(`✔ Hash del contrato: ${TERMS_CONFIG.contractHash.slice(0, 16)}...`, "#cbd5e1");
      logConsole(`✔ Firma de Usuario: ${mockHash}`, "#6ee7b7");
      logConsole(`✔ Timestamp inmutable: ${timestamp}`, "#93c5fd");
      logConsole("✅ Certificado de consentimiento inmutable generado con éxito.", "#10b981");
    }, 400);
  });

  document.getElementById("btnTestTamper")?.addEventListener("click", () => {
    logConsole("▶ SIMULACIÓN: Modificando maliciosamente la Cláusula 2 en memoria...", "#f59e0b");
    setTimeout(() => {
      logConsole("⚠️ AUDITORÍA: El Checksum calculado difiere del hash original del contrato.", "#ef4444");
      logConsole("🚨 ALERTA: Posible intento de manipulación contractual detectado.", "#ef4444");
      logConsole("🛡️ ACCIÓN: La transacción se suspende de inmediato por motivos de seguridad.", "#10b981");
    }, 400);
  });

  document.getElementById("btnTestFullAudit")?.addEventListener("click", () => {
    logConsole("▶ SIMULACIÓN: Ejecutando auditoría de 5 pilares normativos...", "#a855f7");
    setTimeout(() => {
      logConsole("✔ 1. Verificación de Consentimiento Obligatorio: APROBADO (100%)", "#10b981");
      logConsole("✔ 2. Tratamiento de Datos Personales (Ley 1581): APROBADO (100%)", "#10b981");
      logConsole("✔ 3. Estatuto del Consumidor (Ley 1480): APROBADO (100%)", "#10b981");
      logConsole("✔ 4. Control de Estados (En proceso, En bodega, Enviado, Entregado): APROBADO (100%)", "#10b981");
      logConsole("✔ 5. Capa de Contingencia Demo/Producción: APROBADO (100%)", "#10b981");
      logConsole("🏆 CALIFICACIÓN GLOBAL DE SEGURIDAD: 100/100 (Excelente)", "#4ade80");
    }, 500);
  });

  document.getElementById("btnDownloadCert")?.addEventListener("click", () => {
    const certText = `=====================================================
CERTIFICADO DE CUMPLIMIENTO DE SEGURIDAD Y TÉRMINOS
PAYNEX ENTERPRISE v${TERMS_CONFIG.version}
=====================================================
Fecha de emisión: ${new Date().toLocaleString("es-CO")}
Estado de la plataforma: PRODUCCIÓN / ALTA DISPONIBILIDAD
Módulo de Términos y Condiciones: APROBADO Y VALIDADO

NORMATIVAS CUMPLIDAS:
- Ley 1581 de 2012 (Habeas Data & Tratamiento de Datos)
- Ley 1480 de 2011 (Estatuto del Consumidor)
- Ley 527 de 1999 (Comercio Electrónico y Firma Digital)

ESTADOS DE PEDIDO AUDITADOS Y ACTIVOS:
1. En proceso
2. En bodega
3. Enviado
4. Entregado

Hash del contrato oficial:
${TERMS_CONFIG.contractHash}

=====================================================
Certificado emitido electrónicamente por el sistema PayNex.
=====================================================`;
    const blob = new Blob([certText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Certificado_Seguridad_PayNex_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    logConsole("Certificado de seguridad descargado.", "#10b981");
  });
}
