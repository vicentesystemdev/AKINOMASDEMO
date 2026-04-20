const STORAGE_KEY = 'aki_no_mass_data_v2';
const AUTH_KEY = 'aki_no_mass_auth';

const canalesBase = ['TikTok', 'WhatsApp', 'Instagram', 'Facebook', 'Telegram'];
const estadosPedido = ['Nuevo', 'Pendiente', 'Confirmado', 'Enviado', 'Entregado'];
const estadosSeguimiento = [
  'Nuevo contacto',
  'Interesado',
  'En conversación',
  'Pendiente de pago',
  'Confirmado',
  'Enviado',
  'Entregado'
];

const demoData = createDemoData();
let state = loadData();

const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const menu = document.getElementById('menu');
const viewContainer = document.getElementById('view-container');
const viewTitle = document.getElementById('view-title');
const topbarUser = document.getElementById('topbar-user');
const topbarDemoMode = document.getElementById('topbar-demo-mode');

injectSharedUi();
refreshTopbarMeta();

if (localStorage.getItem(AUTH_KEY) === '1') showMain();

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem(AUTH_KEY, '1');
  toast('Ingreso exitoso al modo demo.', 'ok');
  showMain();
});

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem(AUTH_KEY);
  loginView.classList.remove('hidden');
  mainView.classList.add('hidden');
  toast('Sesión cerrada.', 'info');
});

menu.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-view]');
  if (!button) return;
  switchMenu(button.dataset.view);
});

viewContainer.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action], [data-target-view]');
  if (!el) return;
  const { action, id, targetView, entity } = el.dataset;

  if (targetView) return switchMenu(targetView);

  if (action === 'open-modal') return openEntityModal(entity);
  if (action === 'edit-item') return openEntityModal(entity, id);
  if (action === 'delete-item') return removeItem(entity, id);
  if (action === 'change-step') return quickMoveStep(id, Number(el.dataset.move || 0));
  if (action === 'go-state') return quickPedidoState(id, el.dataset.state);
  if (action === 'reset-demo') return restoreInitialData();
});

viewContainer.addEventListener('input', (e) => {
  const target = e.target;
  if (['buscar-clientes', 'filtro-canal-clientes', 'filtro-estado-clientes'].includes(target.id)) renderClientes();
  if (['buscar-productos', 'filtro-categoria-productos', 'filtro-stock-productos'].includes(target.id)) renderProductos();
  if (['buscar-pedidos', 'filtro-estado-pedidos', 'filtro-canal-pedidos'].includes(target.id)) renderPedidos();
});

viewContainer.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.action === 'change-seguimiento') {
    const pedido = state.pedidos.find((p) => p.id === t.dataset.id);
    if (!pedido) return;
    pedido.seguimiento = t.value;
    pedido.estado = mapSeguimientoToEstado(t.value);
    pushActivity('estado_cambiado', `Pedido ${pedido.id.slice(0, 4)} pasó a ${t.value}.`);
    persist();
    renderSeguimiento();
    refreshTopbarMeta();
    toast('Seguimiento actualizado.', 'ok');
  }
});

document.getElementById('modal-root').addEventListener('click', (e) => {
  if (e.target.dataset.action === 'close-modal' || e.target.classList.contains('modal-overlay')) {
    closeModal();
  }
});

document.getElementById('modal-root').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const entity = form.dataset.entity;
  if (entity === 'cliente') return saveCliente(form);
  if (entity === 'producto') return saveProducto(form);
  if (entity === 'pedido') return savePedido(form);
  if (entity === 'configuracion') return saveConfiguracion(form);
});

function showMain() {
  loginView.classList.add('hidden');
  mainView.classList.remove('hidden');
  renderView('dashboard');
}

function switchMenu(view) {
  const targetButton = menu.querySelector(`[data-view="${view}"]`);
  if (targetButton) {
    menu.querySelectorAll('.menu-item').forEach((i) => i.classList.remove('active'));
    targetButton.classList.add('active');
  }
  renderView(view);
}

function renderView(view) {
  const map = {
    dashboard: renderDashboard,
    clientes: renderClientes,
    productos: renderProductos,
    pedidos: renderPedidos,
    seguimiento: renderSeguimiento,
    canales: renderCanales,
    reportes: renderReportes,
    actividad: renderActividad,
    configuracion: renderConfiguracion
  };
  viewTitle.textContent = titleCase(view);
  (map[view] || renderDashboard)();
}

function renderDashboard() {
  const ingresos = sum(state.pedidos.map((p) => Number(p.monto)));
  const conversion = state.clientes.length ? ((state.pedidos.filter((p) => p.estado === 'Entregado').length / state.clientes.length) * 100) : 0;
  const lowStock = state.productos.filter((p) => Number(p.stock) <= 8);
  const recientesPedidos = [...state.pedidos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  const recientesClientes = [...state.clientes].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)).slice(0, 5);
  const alertas = buildAlerts();

  viewContainer.innerHTML = `
    <div class="card-grid">
      <article class="card"><h3>Clientes activos</h3><strong>${state.clientes.filter((c) => c.estado !== 'Inactivo').length}</strong><small>Total: ${state.clientes.length}</small></article>
      <article class="card"><h3>Pedidos en curso</h3><strong>${state.pedidos.filter((p) => ['Nuevo','Pendiente','Confirmado','Enviado'].includes(p.estado)).length}</strong><small>Embudo comercial</small></article>
      <article class="card"><h3>Ingresos estimados</h3><strong>Bs ${ingresos.toFixed(2)}</strong><small>Acumulado demo</small></article>
      <article class="card"><h3>Canal líder</h3><strong>${getCanalPrincipal()}</strong><small>Por pedidos</small></article>
      <article class="card"><h3>Conversión</h3><strong>${conversion.toFixed(1)}%</strong><small>Entregados / Clientes</small></article>
    </div>

    <div class="layout-2">
      <section class="panel">
        <div class="panel-header"><h2>Pedidos recientes</h2><button class="btn-outline" data-target-view="pedidos">Ver módulo</button></div>
        ${tableOrEmpty(recientesPedidos.length, `
          <div class="table-wrap"><table>
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Canal</th><th>Estado</th><th>Monto</th></tr></thead>
            <tbody>
              ${recientesPedidos.map((p) => `<tr><td>${p.fecha}</td><td>${clienteNombre(p.clienteId)}</td><td>${productoNombre(p.productoId)}</td><td>${p.canal}</td><td>${statusBadge(p.estado)}</td><td>Bs ${Number(p.monto).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table></div>
        `, 'Sin pedidos recientes.')}
      </section>

      <section class="panel">
        <div class="panel-header"><h2>Alertas y avisos</h2></div>
        ${alertas.length ? `<ul>${alertas.map((a) => `<li>${a}</li>`).join('')}</ul>` : `<div class="empty-state">Sin alertas por ahora.</div>`}
      </section>
    </div>

    <div class="layout-3">
      <section class="panel"><div class="panel-header"><h2>Resumen por canal</h2></div>${barChart(canalesBase.map((canal) => ({ label: canal, value: state.pedidos.filter((p) => p.canal === canal).length })))}</section>
      <section class="panel"><div class="panel-header"><h2>Pedidos por canal (monto)</h2></div>${barChart(canalesBase.map((canal) => ({ label: canal, value: sum(state.pedidos.filter((p) => p.canal === canal).map((p) => Number(p.monto))) })), true)}</section>
      <section class="panel"><div class="panel-header"><h2>Embudo comercial</h2></div>${barChart(estadosSeguimiento.map((e) => ({ label: e, value: state.pedidos.filter((p) => p.seguimiento === e).length })))}</section>
    </div>

    <div class="layout-2">
      <section class="panel">
        <div class="panel-header"><h2>Clientes recientes</h2><button class="btn-outline" data-target-view="clientes">Ver módulo</button></div>
        ${tableOrEmpty(recientesClientes.length, `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Celular</th><th>Canal</th><th>Estado</th><th>Registro</th></tr></thead><tbody>${recientesClientes.map((c) => `<tr><td>${c.nombre}</td><td>${c.celular}</td><td>${c.canal}</td><td>${statusBadge(c.estado)}</td><td>${c.fechaRegistro}</td></tr>`).join('')}</tbody></table></div>`, 'No hay clientes recientes.')}
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Productos con menor stock</h2><button class="btn-outline" data-target-view="productos">Ver catálogo</button></div>
        ${tableOrEmpty(lowStock.length, `<div class="table-wrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Precio</th></tr></thead><tbody>${lowStock.map((p) => `<tr><td>${p.nombre}</td><td>${p.categoria}</td><td>${p.stock}</td><td>Bs ${Number(p.precio).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`, 'Todo el stock está controlado.')}
      </section>
    </div>
  `;
}

function renderClientes() {
  const q = (document.getElementById('buscar-clientes')?.value || '').toLowerCase().trim();
  const canal = document.getElementById('filtro-canal-clientes')?.value || '';
  const estado = document.getElementById('filtro-estado-clientes')?.value || '';

  const rows = state.clientes.filter((c) =>
    (!q || c.nombre.toLowerCase().includes(q) || c.celular.toLowerCase().includes(q)) &&
    (!canal || c.canal === canal) &&
    (!estado || c.estado === estado)
  );

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>CRM de clientes</h2>
        <div class="toolbar">
          <input id="buscar-clientes" placeholder="Buscar por nombre o celular" value="${escapeHtml(q)}" />
          <select id="filtro-canal-clientes"><option value="">Canal</option>${canalesBase.map(c => `<option ${canal===c?'selected':''}>${c}</option>`).join('')}</select>
          <select id="filtro-estado-clientes"><option value="">Estado</option>${['Activo','Pendiente','Inactivo'].map(s => `<option ${estado===s?'selected':''}>${s}</option>`).join('')}</select>
          <button class="btn-primary" data-action="open-modal" data-entity="cliente">+ Nuevo cliente</button>
        </div>
      </div>
      ${tableOrEmpty(rows.length, `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Celular</th><th>Canal</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${rows.map((c) => `<tr><td>${c.nombre}</td><td>${c.celular}</td><td>${c.canal}</td><td>${statusBadge(c.estado)}</td><td>${c.fechaRegistro}</td><td class="actions"><button class="btn-secondary" data-action="edit-item" data-entity="cliente" data-id="${c.id}">Editar</button><button class="btn-danger" data-action="delete-item" data-entity="cliente" data-id="${c.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`, 'No se encontraron clientes para el filtro seleccionado.')}
    </section>
  `;
}

function renderProductos() {
  const q = (document.getElementById('buscar-productos')?.value || '').toLowerCase().trim();
  const categoria = document.getElementById('filtro-categoria-productos')?.value || '';
  const stockFiltro = document.getElementById('filtro-stock-productos')?.value || '';

  const categorias = [...new Set(state.productos.map((p) => p.categoria))];
  const rows = state.productos.filter((p) =>
    (!q || p.nombre.toLowerCase().includes(q)) &&
    (!categoria || p.categoria === categoria) &&
    (!stockFiltro || (stockFiltro === 'bajo' ? Number(p.stock) <= 8 : Number(p.stock) > 8))
  );

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>Catálogo de productos</h2>
        <div class="toolbar">
          <input id="buscar-productos" placeholder="Buscar producto" value="${escapeHtml(q)}" />
          <select id="filtro-categoria-productos"><option value="">Categoría</option>${categorias.map(c => `<option ${categoria===c?'selected':''}>${c}</option>`).join('')}</select>
          <select id="filtro-stock-productos"><option value="">Stock</option><option value="bajo" ${stockFiltro==='bajo'?'selected':''}>Bajo (≤8)</option><option value="normal" ${stockFiltro==='normal'?'selected':''}>Normal (>8)</option></select>
          <button class="btn-primary" data-action="open-modal" data-entity="producto">+ Nuevo producto</button>
        </div>
      </div>
      ${tableOrEmpty(rows.length, `<div class="table-wrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Talla</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody>${rows.map((p) => `<tr><td>${p.nombre}</td><td>${p.categoria}</td><td>${p.talla}</td><td>Bs ${Number(p.precio).toFixed(2)}</td><td>${p.stock}</td><td class="actions"><button class="btn-secondary" data-action="edit-item" data-entity="producto" data-id="${p.id}">Editar</button><button class="btn-danger" data-action="delete-item" data-entity="producto" data-id="${p.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`, 'No hay productos con estos filtros.')}
    </section>
  `;
}

function renderPedidos() {
  const q = (document.getElementById('buscar-pedidos')?.value || '').toLowerCase().trim();
  const estado = document.getElementById('filtro-estado-pedidos')?.value || '';
  const canal = document.getElementById('filtro-canal-pedidos')?.value || '';

  const rows = state.pedidos.filter((p) =>
    (!q || clienteNombre(p.clienteId).toLowerCase().includes(q) || productoNombre(p.productoId).toLowerCase().includes(q)) &&
    (!estado || p.estado === estado) &&
    (!canal || p.canal === canal)
  );

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>Gestión de pedidos</h2>
        <div class="toolbar">
          <input id="buscar-pedidos" placeholder="Buscar cliente o producto" value="${escapeHtml(q)}" />
          <select id="filtro-estado-pedidos"><option value="">Estado</option>${estadosPedido.map((s) => `<option ${estado===s?'selected':''}>${s}</option>`).join('')}</select>
          <select id="filtro-canal-pedidos"><option value="">Canal</option>${canalesBase.map((c) => `<option ${canal===c?'selected':''}>${c}</option>`).join('')}</select>
          <button class="btn-primary" data-action="open-modal" data-entity="pedido">+ Nuevo pedido</button>
        </div>
      </div>
      ${tableOrEmpty(rows.length, `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Canal</th><th>Seguimiento</th><th>Acciones</th></tr></thead><tbody>${rows.map((p) => `<tr><td>${p.fecha}</td><td>${clienteNombre(p.clienteId)}</td><td>${productoNombre(p.productoId)}</td><td>Bs ${Number(p.monto).toFixed(2)}</td><td>${statusBadge(p.estado)}</td><td>${p.canal}</td><td>${statusBadge(p.seguimiento)}</td><td class="actions"><button class="btn-secondary" data-action="edit-item" data-entity="pedido" data-id="${p.id}">Editar</button><button class="btn-outline" data-action="go-state" data-id="${p.id}" data-state="Entregado">Entregar</button><button class="btn-danger" data-action="delete-item" data-entity="pedido" data-id="${p.id}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`, 'No hay pedidos para los filtros seleccionados.')}
    </section>
  `;
}

function renderSeguimiento() {
  const funnelData = estadosSeguimiento.map((est) => ({ est, total: state.pedidos.filter((p) => p.seguimiento === est).length }));
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Pipeline comercial</h2></div>
      <div class="progress-line">${funnelData.map((f) => `<div class="step"><span>${f.est}</span><strong>${f.total}</strong></div>`).join('')}</div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Mover registros entre estados</h2></div>
      ${tableOrEmpty(state.pedidos.length, `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Pedido</th><th>Estado actual</th><th>Actualizar etapa</th><th>Atajos</th></tr></thead><tbody>${state.pedidos.map((p) => `<tr><td>${clienteNombre(p.clienteId)}</td><td>${productoNombre(p.productoId)} - Bs ${Number(p.monto).toFixed(2)}</td><td>${statusBadge(p.seguimiento)}</td><td><select data-action="change-seguimiento" data-id="${p.id}">${estadosSeguimiento.map((est) => `<option ${p.seguimiento===est?'selected':''}>${est}</option>`).join('')}</select></td><td class="actions"><button class="btn-outline" data-action="change-step" data-id="${p.id}" data-move="-1">◀</button><button class="btn-outline" data-action="change-step" data-id="${p.id}" data-move="1">▶</button></td></tr>`).join('')}</tbody></table></div>`, 'Aún no hay registros para seguimiento.')}
    </section>
  `;
}

function renderCanales() {
  const stats = canalesBase.map((canal) => {
    const clientes = state.clientes.filter((c) => c.canal === canal).length;
    const pedidos = state.pedidos.filter((p) => p.canal === canal);
    return { canal, clientes, pedidos: pedidos.length, ventas: sum(pedidos.map((p) => Number(p.monto))) };
  });
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Rendimiento multicanal</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Canal</th><th>Clientes</th><th>Pedidos</th><th>Ingresos</th><th>Conversión estimada</th></tr></thead><tbody>${stats.map((s) => `<tr><td>${s.canal}</td><td>${s.clientes}</td><td>${s.pedidos}</td><td>Bs ${s.ventas.toFixed(2)}</td><td>${s.clientes ? ((s.pedidos / s.clientes) * 100).toFixed(1) : 0}%</td></tr>`).join('')}</tbody></table></div>
    </section>
  `;
}

function renderReportes() {
  const pedidosPorCanal = canalesBase.map((canal) => ({ label: canal, value: state.pedidos.filter((p) => p.canal === canal).length }));
  const clientesPorCanal = canalesBase.map((canal) => ({ label: canal, value: state.clientes.filter((c) => c.canal === canal).length }));
  const pedidosPorEstado = estadosPedido.map((est) => ({ label: est, value: state.pedidos.filter((p) => p.estado === est).length }));
  const ingresos = sum(state.pedidos.map((p) => Number(p.monto)));
  const entregados = state.pedidos.filter((p) => p.estado === 'Entregado').length;
  const conversion = state.pedidos.length ? (entregados / state.pedidos.length) * 100 : 0;
  const resumenSemana = buildWeeklySummary();

  viewContainer.innerHTML = `
    <div class="card-grid">
      <article class="card"><h3>Ingresos estimados</h3><strong>Bs ${ingresos.toFixed(2)}</strong><small>Reporte acumulado</small></article>
      <article class="card"><h3>Tasa de conversión</h3><strong>${conversion.toFixed(1)}%</strong><small>Pedidos entregados</small></article>
      <article class="card"><h3>Pedidos totales</h3><strong>${state.pedidos.length}</strong><small>Todos los estados</small></article>
      <article class="card"><h3>Clientes captados</h3><strong>${state.clientes.length}</strong><small>Base total</small></article>
      <article class="card"><h3>Ticket promedio</h3><strong>Bs ${(state.pedidos.length ? ingresos / state.pedidos.length : 0).toFixed(2)}</strong><small>Simulado</small></article>
    </div>

    <section class="panel"><div class="panel-header"><h2>Ventas por canal</h2></div>${barChart(canalesBase.map((canal) => ({ label: canal, value: sum(state.pedidos.filter((p) => p.canal === canal).map((p) => Number(p.monto))) })), true)}</section>
    <section class="panel"><div class="panel-header"><h2>Clientes por canal</h2></div>${barChart(clientesPorCanal)}</section>
    <section class="panel"><div class="panel-header"><h2>Pedidos por estado</h2></div>${barChart(pedidosPorEstado)}</section>
    <section class="panel"><div class="panel-header"><h2>Resumen semanal demo</h2></div><div class="table-wrap"><table><thead><tr><th>Semana</th><th>Pedidos</th><th>Ingresos</th></tr></thead><tbody>${resumenSemana.map((r) => `<tr><td>${r.semana}</td><td>${r.pedidos}</td><td>Bs ${r.ingresos.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></section>
  `;
}

function renderActividad() {
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Actividad reciente del sistema</h2></div>
      ${tableOrEmpty(state.actividad.length, `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>${state.actividad.slice(0, 60).map((a) => `<tr><td>${a.fecha}</td><td>${statusBadge(a.tipoLabel)}</td><td>${a.detalle}</td></tr>`).join('')}</tbody></table></div>`, 'No hay actividad registrada todavía.')}
    </section>
  `;
}

function renderConfiguracion() {
  const c = state.config;
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Configuración del sistema</h2><div class="toolbar"><button class="btn-secondary" data-action="open-modal" data-entity="configuracion">Editar configuración</button><button class="btn-danger" data-action="reset-demo">Restaurar datos iniciales</button></div></div>
      <div class="layout-3">
        <article class="card"><h3>Nombre del negocio</h3><strong>${c.businessName}</strong></article>
        <article class="card"><h3>Moneda</h3><strong>${c.currency}</strong></article>
        <article class="card"><h3>Usuario demo</h3><strong>${c.demoUser}</strong></article>
      </div>
      <div class="layout-2">
        <article class="card"><h3>Sistema</h3><strong>${c.systemName}</strong><small>Vista principal</small></article>
        <article class="card"><h3>Modo demo</h3><strong>${c.demoMode ? 'Activado' : 'Desactivado'}</strong><small>Ambiente local</small></article>
      </div>
    </section>
  `;
}

function openEntityModal(entity, id = null) {
  const data = id ? findByEntity(entity, id) : null;
  const title = id ? 'Editar registro' : 'Nuevo registro';
  let form = '';

  if (entity === 'cliente') {
    form = `<form data-entity="cliente"><input type="hidden" name="id" value="${data?.id || ''}" /><div class="form-grid"><div><label>Nombre completo</label><input name="nombre" required minlength="5" value="${escapeHtml(data?.nombre || '')}" /></div><div><label>Celular</label><input name="celular" required pattern="[0-9\-+ ]{7,20}" value="${escapeHtml(data?.celular || '')}" /></div><div><label>Canal</label><select name="canal">${canalesBase.map((c) => `<option ${data?.canal===c?'selected':''}>${c}</option>`).join('')}</select></div><div><label>Estado</label><select name="estado">${['Activo','Pendiente','Inactivo'].map((s) => `<option ${data?.estado===s?'selected':''}>${s}</option>`).join('')}</select></div><div><label>Fecha registro</label><input type="date" name="fechaRegistro" required value="${data?.fechaRegistro || today()}" /></div></div><div class="modal-footer"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button>Guardar cliente</button></div></form>`;
  }

  if (entity === 'producto') {
    form = `<form data-entity="producto"><input type="hidden" name="id" value="${data?.id || ''}" /><div class="form-grid"><div><label>Producto</label><input name="nombre" required minlength="4" value="${escapeHtml(data?.nombre || '')}" /></div><div><label>Categoría</label><input name="categoria" required value="${escapeHtml(data?.categoria || '')}" /></div><div><label>Talla</label><input name="talla" required value="${escapeHtml(data?.talla || '')}" placeholder="S, M, L, XL" /></div><div><label>Precio (Bs)</label><input name="precio" type="number" step="0.01" min="1" required value="${data?.precio || ''}" /></div><div><label>Stock</label><input name="stock" type="number" min="0" required value="${data?.stock ?? ''}" /></div></div><div class="modal-footer"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button>Guardar producto</button></div></form>`;
  }

  if (entity === 'pedido') {
    form = `<form data-entity="pedido"><input type="hidden" name="id" value="${data?.id || ''}" /><div class="form-grid"><div><label>Cliente</label><select name="clienteId" required>${state.clientes.map((c) => `<option value="${c.id}" ${data?.clienteId===c.id?'selected':''}>${c.nombre}</option>`).join('')}</select></div><div><label>Producto</label><select name="productoId" required>${state.productos.map((p) => `<option value="${p.id}" ${data?.productoId===p.id?'selected':''}>${p.nombre}</option>`).join('')}</select></div><div><label>Monto (Bs)</label><input name="monto" type="number" min="1" step="0.01" required value="${data?.monto || ''}" /></div><div><label>Estado</label><select name="estado">${estadosPedido.map((s) => `<option ${data?.estado===s?'selected':''}>${s}</option>`).join('')}</select></div><div><label>Canal</label><select name="canal">${canalesBase.map((c) => `<option ${data?.canal===c?'selected':''}>${c}</option>`).join('')}</select></div><div><label>Fecha</label><input type="date" name="fecha" required value="${data?.fecha || today()}" /></div></div><div class="modal-footer"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button>Guardar pedido</button></div></form>`;
  }

  if (entity === 'configuracion') {
    form = `<form data-entity="configuracion"><div class="form-grid"><div><label>Nombre del sistema</label><input name="systemName" required value="${escapeHtml(state.config.systemName)}" /></div><div><label>Nombre del negocio</label><input name="businessName" required value="${escapeHtml(state.config.businessName)}" /></div><div><label>Moneda</label><input name="currency" required value="${escapeHtml(state.config.currency)}" /></div><div><label>Usuario demo</label><input name="demoUser" required value="${escapeHtml(state.config.demoUser)}" /></div><div><label>Modo demo</label><select name="demoMode"><option value="1" ${state.config.demoMode ? 'selected' : ''}>Activado</option><option value="0" ${!state.config.demoMode ? 'selected' : ''}>Desactivado</option></select></div></div><div class="modal-footer"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button>Guardar configuración</button></div></form>`;
  }

  document.getElementById('modal-root').innerHTML = `<div class="modal-overlay"><div class="modal"><div class="modal-header"><h3>${title}</h3><button class="btn-outline" data-action="close-modal">✕</button></div>${form}</div></div>`;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function saveCliente(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!payload.nombre || payload.nombre.length < 5) return toast('Nombre de cliente inválido.', 'warn');

  if (payload.id) {
    state.clientes = state.clientes.map((c) => c.id === payload.id ? payload : c);
    pushActivity('cliente_editado', `Cliente actualizado: ${payload.nombre}.`);
  } else {
    payload.id = uid();
    state.clientes.unshift(payload);
    pushActivity('cliente_agregado', `Cliente agregado: ${payload.nombre}.`);
  }
  persist();
  closeModal();
  renderClientes();
  toast('Cliente guardado correctamente.', 'ok');
}

function saveProducto(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.precio = Number(payload.precio);
  payload.stock = Number(payload.stock);
  if (!payload.nombre || payload.precio <= 0) return toast('Completa datos de producto correctamente.', 'warn');

  if (payload.id) {
    state.productos = state.productos.map((p) => p.id === payload.id ? payload : p);
    pushActivity('producto_editado', `Producto actualizado: ${payload.nombre}.`);
  } else {
    payload.id = uid();
    state.productos.unshift(payload);
    pushActivity('producto_creado', `Producto creado: ${payload.nombre}.`);
  }
  persist();
  closeModal();
  renderProductos();
  toast('Producto guardado correctamente.', 'ok');
}

function savePedido(form) {
  if (!state.clientes.length || !state.productos.length) return toast('Debes tener clientes y productos antes de crear pedidos.', 'warn');
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.monto = Number(payload.monto);
  payload.seguimiento = mapEstadoToSeguimiento(payload.estado);

  if (payload.id) {
    state.pedidos = state.pedidos.map((p) => p.id === payload.id ? { ...p, ...payload } : p);
    pushActivity('pedido_actualizado', `Pedido ${payload.id.slice(0, 4)} actualizado.`);
  } else {
    payload.id = uid();
    state.pedidos.unshift(payload);
    pushActivity('pedido_creado', `Pedido creado para ${clienteNombre(payload.clienteId)}.`);
  }
  persist();
  closeModal();
  renderPedidos();
  refreshTopbarMeta();
  toast('Pedido guardado correctamente.', 'ok');
}

function saveConfiguracion(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  state.config = {
    ...state.config,
    systemName: payload.systemName,
    businessName: payload.businessName,
    currency: payload.currency,
    demoUser: payload.demoUser,
    demoMode: payload.demoMode === '1'
  };
  pushActivity('configuracion', 'Configuración general actualizada.');
  persist();
  closeModal();
  refreshTopbarMeta();
  renderConfiguracion();
  toast('Configuración actualizada.', 'ok');
}

function removeItem(entity, id) {
  if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
  const map = { cliente: 'clientes', producto: 'productos', pedido: 'pedidos' };
  const key = map[entity];
  if (!key) return;
  state[key] = state[key].filter((item) => item.id !== id);
  pushActivity('eliminado', `${titleCase(entity)} eliminado.`);
  persist();
  renderView(menu.querySelector('.menu-item.active')?.dataset.view || 'dashboard');
  refreshTopbarMeta();
  toast('Registro eliminado.', 'info');
}

function quickMoveStep(id, move) {
  const pedido = state.pedidos.find((p) => p.id === id);
  if (!pedido) return;
  const currentIdx = Math.max(0, estadosSeguimiento.indexOf(pedido.seguimiento));
  const next = Math.min(estadosSeguimiento.length - 1, Math.max(0, currentIdx + move));
  pedido.seguimiento = estadosSeguimiento[next];
  pedido.estado = mapSeguimientoToEstado(pedido.seguimiento);
  pushActivity('estado_cambiado', `Pedido ${pedido.id.slice(0, 4)} ahora está en ${pedido.seguimiento}.`);
  persist();
  renderSeguimiento();
  refreshTopbarMeta();
}

function quickPedidoState(id, stateName) {
  const pedido = state.pedidos.find((p) => p.id === id);
  if (!pedido) return;
  pedido.estado = stateName;
  pedido.seguimiento = mapEstadoToSeguimiento(stateName);
  pushActivity('pedido_actualizado', `Pedido ${pedido.id.slice(0, 4)} marcado como ${stateName}.`);
  persist();
  renderPedidos();
  toast('Estado de pedido actualizado.', 'ok');
}

function restoreInitialData() {
  if (!confirm('Esto restaurará todo el demo. ¿Continuar?')) return;
  state = createDemoData();
  persist();
  pushActivity('restauracion', 'Se restauraron datos iniciales del demo.');
  refreshTopbarMeta();
  renderConfiguracion();
  toast('Datos iniciales restaurados.', 'info');
}

function injectSharedUi() {
  if (!document.getElementById('modal-root')) {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }
  if (!document.getElementById('toast-wrap')) {
    const toastWrap = document.createElement('div');
    toastWrap.id = 'toast-wrap';
    toastWrap.className = 'toast-wrap';
    document.body.appendChild(toastWrap);
  }
}

function refreshTopbarMeta() {
  topbarUser.textContent = state.config.demoUser;
  topbarDemoMode.textContent = state.config.demoMode ? 'Modo demo' : 'Modo real (simulado)';
}

function createDemoData() {
  const clientes = [
    { id: uid(), nombre: 'María Fernanda Quispe', celular: '591-72133421', canal: 'TikTok', estado: 'Activo', fechaRegistro: '2026-04-03' },
    { id: uid(), nombre: 'Luis Alberto Rojas', celular: '591-76519874', canal: 'WhatsApp', estado: 'Activo', fechaRegistro: '2026-04-05' },
    { id: uid(), nombre: 'Camila Andrade', celular: '591-70911833', canal: 'Instagram', estado: 'Pendiente', fechaRegistro: '2026-04-07' },
    { id: uid(), nombre: 'Javier Poma', celular: '591-72345610', canal: 'Facebook', estado: 'Activo', fechaRegistro: '2026-04-10' },
    { id: uid(), nombre: 'Daniela Choque', celular: '591-70677221', canal: 'Telegram', estado: 'Inactivo', fechaRegistro: '2026-04-11' }
  ];
  const productos = [
    { id: uid(), nombre: 'Polera Oversize Urbana', categoria: 'Poleras', talla: 'M-L', precio: 129, stock: 28 },
    { id: uid(), nombre: 'Jeans Skinny Fit', categoria: 'Jeans', talla: '30-34', precio: 189, stock: 16 },
    { id: uid(), nombre: 'Pantalón Cargo Street', categoria: 'Pantalones', talla: 'M-L', precio: 219, stock: 6 },
    { id: uid(), nombre: 'Chompa Tejida Invierno', categoria: 'Chompas', talla: 'S-M', precio: 169, stock: 8 },
    { id: uid(), nombre: 'Conjunto Deportivo Lite', categoria: 'Conjuntos', talla: 'M', precio: 249, stock: 11 }
  ];
  const [c1, c2, c3, c4, c5] = clientes;
  const [p1, p2, p3, p4, p5] = productos;
  const pedidos = [
    { id: uid(), clienteId: c1.id, productoId: p1.id, monto: 129, estado: 'Confirmado', fecha: '2026-04-12', canal: 'TikTok', seguimiento: 'Confirmado' },
    { id: uid(), clienteId: c2.id, productoId: p2.id, monto: 189, estado: 'Pendiente', fecha: '2026-04-14', canal: 'WhatsApp', seguimiento: 'Pendiente de pago' },
    { id: uid(), clienteId: c3.id, productoId: p4.id, monto: 169, estado: 'Enviado', fecha: '2026-04-15', canal: 'Instagram', seguimiento: 'Enviado' },
    { id: uid(), clienteId: c4.id, productoId: p3.id, monto: 219, estado: 'Entregado', fecha: '2026-04-16', canal: 'Facebook', seguimiento: 'Entregado' },
    { id: uid(), clienteId: c5.id, productoId: p5.id, monto: 249, estado: 'Pendiente', fecha: '2026-04-17', canal: 'Telegram', seguimiento: 'Interesado' },
    { id: uid(), clienteId: c1.id, productoId: p3.id, monto: 219, estado: 'Nuevo', fecha: '2026-04-18', canal: 'TikTok', seguimiento: 'Nuevo contacto' }
  ];

  return {
    config: {
      systemName: 'AKI NO MASS',
      businessName: 'AKI NO MASS Store',
      currency: 'Bs',
      demoUser: 'demo@akinomass.com',
      demoMode: true
    },
    clientes,
    productos,
    pedidos,
    actividad: [
      { id: uid(), fecha: `${today()} 09:00`, tipo: 'inicio', tipoLabel: 'Inicio', detalle: 'Datos demo inicializados.' }
    ]
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
  return structuredClone(demoData);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pushActivity(tipo, detalle) {
  const labels = {
    cliente_agregado: 'Cliente agregado',
    cliente_editado: 'Cliente actualizado',
    producto_creado: 'Producto creado',
    producto_editado: 'Producto actualizado',
    pedido_creado: 'Pedido creado',
    pedido_actualizado: 'Pedido actualizado',
    estado_cambiado: 'Estado cambiado',
    eliminado: 'Eliminación',
    configuracion: 'Configuración',
    restauracion: 'Restauración',
    inicio: 'Inicio'
  };
  state.actividad.unshift({
    id: uid(),
    fecha: `${today()} ${new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`,
    tipo,
    tipoLabel: labels[tipo] || 'Acción',
    detalle
  });
  state.actividad = state.actividad.slice(0, 120);
}

function getCanalPrincipal() {
  const counter = canalesBase.map((canal) => ({ canal, total: state.pedidos.filter((p) => p.canal === canal).length }));
  counter.sort((a, b) => b.total - a.total);
  return counter[0]?.canal || 'N/A';
}

function buildAlerts() {
  const alerts = [];
  const lowStock = state.productos.filter((p) => Number(p.stock) <= 8).length;
  if (lowStock) alerts.push(`${lowStock} producto(s) con stock bajo.`);
  const pendientes = state.pedidos.filter((p) => p.estado === 'Pendiente').length;
  if (pendientes) alerts.push(`${pendientes} pedido(s) pendientes de confirmación.`);
  const inactivos = state.clientes.filter((c) => c.estado === 'Inactivo').length;
  if (inactivos) alerts.push(`${inactivos} cliente(s) inactivos para reactivación.`);
  return alerts;
}

function buildWeeklySummary() {
  const weeks = [
    { semana: 'Semana 1', from: '2026-04-01', to: '2026-04-07' },
    { semana: 'Semana 2', from: '2026-04-08', to: '2026-04-14' },
    { semana: 'Semana 3', from: '2026-04-15', to: '2026-04-21' },
    { semana: 'Semana 4', from: '2026-04-22', to: '2026-04-30' }
  ];
  return weeks.map((w) => {
    const pedidos = state.pedidos.filter((p) => p.fecha >= w.from && p.fecha <= w.to);
    return { semana: w.semana, pedidos: pedidos.length, ingresos: sum(pedidos.map((p) => Number(p.monto))) };
  });
}

function findByEntity(entity, id) {
  const map = { cliente: state.clientes, producto: state.productos, pedido: state.pedidos };
  return map[entity]?.find((x) => x.id === id) || null;
}

function mapEstadoToSeguimiento(estado) {
  const rel = {
    Nuevo: 'Nuevo contacto',
    Pendiente: 'Pendiente de pago',
    Confirmado: 'Confirmado',
    Enviado: 'Enviado',
    Entregado: 'Entregado'
  };
  return rel[estado] || 'Nuevo contacto';
}

function mapSeguimientoToEstado(seg) {
  if (seg === 'Entregado') return 'Entregado';
  if (seg === 'Enviado') return 'Enviado';
  if (seg === 'Confirmado') return 'Confirmado';
  if (seg === 'Pendiente de pago') return 'Pendiente';
  return 'Nuevo';
}

function toast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  document.getElementById('toast-wrap').appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

function barChart(data, currency = false) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return `<div class="bar-chart">${data.map((d) => `<div class="bar-row"><span>${d.label}</span><div class="bar"><i style="width:${(d.value / max) * 100}%"></i></div><strong>${currency ? `Bs ${Number(d.value).toFixed(2)}` : d.value}</strong></div>`).join('')}</div>`;
}

function tableOrEmpty(count, tableHtml, emptyMsg) {
  return count ? tableHtml : `<div class="empty-state">${emptyMsg}</div>`;
}

function statusBadge(status) {
  const clean = String(status).toLowerCase().replace(/\s+/g, '-');
  return `<span class="status ${clean}">${status}</span>`;
}

function clienteNombre(id) {
  return state.clientes.find((c) => c.id === id)?.nombre || 'Cliente no disponible';
}
function productoNombre(id) {
  return state.productos.find((p) => p.id === id)?.nombre || 'Producto no disponible';
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function titleCase(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
function today() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
