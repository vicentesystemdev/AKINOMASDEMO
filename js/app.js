const STORAGE_KEY = 'aki_no_mass_data_v1';
const AUTH_KEY = 'aki_no_mass_auth';

const canalesBase = ['TikTok', 'WhatsApp', 'Instagram', 'Facebook', 'Telegram'];
const estadosSeguimiento = [
  'Nuevo contacto',
  'Interesado',
  'En conversación',
  'Pendiente de pago',
  'Confirmado',
  'Enviado',
  'Entregado'
];

const demoData = {
  config: {
    systemName: 'AKI NO MASS',
    businessName: 'AKI NO MASS Store',
    demoUser: 'demo@akinomass.com',
    demoMode: 'Activado'
  },
  clientes: [
    { id: uid(), nombre: 'María Fernanda Quispe', celular: '591-72133421', canal: 'TikTok', estado: 'Activo', fecha: '2026-04-03' },
    { id: uid(), nombre: 'Luis Alberto Rojas', celular: '591-76519874', canal: 'WhatsApp', estado: 'Activo', fecha: '2026-04-05' },
    { id: uid(), nombre: 'Camila Andrade', celular: '591-70911833', canal: 'Instagram', estado: 'Pendiente', fecha: '2026-04-07' },
    { id: uid(), nombre: 'Javier Poma', celular: '591-72345610', canal: 'Facebook', estado: 'Activo', fecha: '2026-04-10' },
    { id: uid(), nombre: 'Daniela Choque', celular: '591-70677221', canal: 'Telegram', estado: 'Inactivo', fecha: '2026-04-11' }
  ],
  productos: [
    { id: uid(), nombre: 'Polera Oversize Urbana', categoria: 'Poleras', precio: 129, stock: 28 },
    { id: uid(), nombre: 'Jeans Skinny Fit', categoria: 'Pantalones', precio: 189, stock: 16 },
    { id: uid(), nombre: 'Chaqueta Denim Premium', categoria: 'Chaquetas', precio: 279, stock: 10 },
    { id: uid(), nombre: 'Vestido Casual Verano', categoria: 'Vestidos', precio: 169, stock: 18 },
    { id: uid(), nombre: 'Buzo Deportivo Unisex', categoria: 'Deportiva', precio: 149, stock: 25 }
  ],
  pedidos: []
};

function seedOrders() {
  const [c1, c2, c3, c4, c5] = demoData.clientes;
  const [p1, p2, p3, p4, p5] = demoData.productos;
  return [
    { id: uid(), clienteId: c1.id, productoId: p1.id, monto: 129, estado: 'Confirmado', fecha: '2026-04-12', canal: 'TikTok', seguimiento: 'Confirmado' },
    { id: uid(), clienteId: c2.id, productoId: p2.id, monto: 189, estado: 'Pendiente', fecha: '2026-04-14', canal: 'WhatsApp', seguimiento: 'Pendiente de pago' },
    { id: uid(), clienteId: c3.id, productoId: p4.id, monto: 169, estado: 'Enviado', fecha: '2026-04-15', canal: 'Instagram', seguimiento: 'Enviado' },
    { id: uid(), clienteId: c4.id, productoId: p3.id, monto: 279, estado: 'Entregado', fecha: '2026-04-16', canal: 'Facebook', seguimiento: 'Entregado' },
    { id: uid(), clienteId: c5.id, productoId: p5.id, monto: 149, estado: 'Pendiente', fecha: '2026-04-17', canal: 'Telegram', seguimiento: 'Interesado' },
    { id: uid(), clienteId: c1.id, productoId: p3.id, monto: 279, estado: 'Nuevo', fecha: '2026-04-18', canal: 'TikTok', seguimiento: 'Nuevo contacto' }
  ];
}

demoData.pedidos = seedOrders();

let state = loadData();

const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loginForm = document.getElementById('login-form');
const menu = document.getElementById('menu');
const viewContainer = document.getElementById('view-container');
const viewTitle = document.getElementById('view-title');

if (localStorage.getItem(AUTH_KEY) === '1') showMain();

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem(AUTH_KEY, '1');
  showMain();
});

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem(AUTH_KEY);
  loginView.classList.remove('hidden');
  mainView.classList.add('hidden');
});

menu.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-view]');
  if (!button) return;
  menu.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  renderView(button.dataset.view);
});

viewContainer.addEventListener('click', (e) => {
  const { action, id, targetView } = e.target.dataset;
  if (targetView) {
    switchMenu(targetView);
    return;
  }
  if (!action) return;

  if (action === 'delete-cliente') removeItem('clientes', id);
  if (action === 'delete-producto') removeItem('productos', id);
  if (action === 'delete-pedido') removeItem('pedidos', id);

  if (action === 'edit-cliente') fillForm('cliente-form', state.clientes.find((c) => c.id === id));
  if (action === 'edit-producto') fillForm('producto-form', state.productos.find((p) => p.id === id));
  if (action === 'edit-pedido') fillForm('pedido-form', state.pedidos.find((p) => p.id === id));
});

viewContainer.addEventListener('change', (e) => {
  if (e.target.dataset.action === 'change-seguimiento') {
    const pedido = state.pedidos.find((p) => p.id === e.target.dataset.id);
    if (!pedido) return;
    pedido.seguimiento = e.target.value;
    if (['Confirmado', 'Enviado', 'Entregado'].includes(e.target.value)) pedido.estado = e.target.value;
    persist();
    renderView('seguimiento');
  }
});

viewContainer.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'cliente-form') saveCliente(form);
  if (form.id === 'producto-form') saveProducto(form);
  if (form.id === 'pedido-form') savePedido(form);
});

viewContainer.addEventListener('input', (e) => {
  if (e.target.id === 'buscar-clientes' || e.target.id === 'filtro-canal-clientes' || e.target.id === 'filtro-estado-clientes') renderClientes();
  if (e.target.id === 'filtro-estado-pedidos' || e.target.id === 'filtro-canal-pedidos') renderPedidos();
});

function showMain() {
  loginView.classList.add('hidden');
  mainView.classList.remove('hidden');
  renderView('dashboard');
}

function switchMenu(view) {
  const targetButton = menu.querySelector(`[data-view="${view}"]`);
  if (targetButton) {
    menu.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
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
    canales: renderCanales,
    seguimiento: renderSeguimiento,
    reportes: renderReportes,
    configuracion: renderConfiguracion
  };
  viewTitle.textContent = titleCase(view);
  (map[view] || renderDashboard)();
}

function renderDashboard() {
  const totalClientes = state.clientes.length;
  const pedidosActivos = state.pedidos.filter((p) => ['Nuevo', 'Pendiente', 'Confirmado', 'Enviado'].includes(p.estado)).length;
  const ventas = sum(state.pedidos.map((p) => Number(p.monto)));
  const canalPrincipal = getCanalPrincipal();
  const recientes = [...state.pedidos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);

  viewContainer.innerHTML = `
    <div class="card-grid">
      <article class="card"><h3>Clientes registrados</h3><strong>${totalClientes}</strong></article>
      <article class="card"><h3>Pedidos activos</h3><strong>${pedidosActivos}</strong></article>
      <article class="card"><h3>Ventas estimadas</h3><strong>Bs ${ventas.toFixed(2)}</strong></article>
      <article class="card"><h3>Canal principal</h3><strong>${canalPrincipal}</strong></article>
    </div>

    <section class="panel">
      <div class="panel-header"><h2>Accesos rápidos</h2></div>
      <div class="quick-actions">
        <button data-target-view="clientes">+ Nuevo cliente</button>
        <button data-target-view="pedidos">+ Nuevo pedido</button>
        <button data-target-view="reportes">Ver reportes</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Últimos pedidos</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${recientes.map((p) => `
              <tr>
                <td>${clienteNombre(p.clienteId)}</td>
                <td>${productoNombre(p.productoId)}</td>
                <td>Bs ${Number(p.monto).toFixed(2)}</td>
                <td>${statusBadge(p.estado)}</td>
                <td>${p.fecha}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderClientes() {
  const q = (document.getElementById('buscar-clientes')?.value || '').toLowerCase();
  const canal = document.getElementById('filtro-canal-clientes')?.value || '';
  const estado = document.getElementById('filtro-estado-clientes')?.value || '';

  const rows = state.clientes.filter((c) =>
    (!q || c.nombre.toLowerCase().includes(q) || c.celular.includes(q)) &&
    (!canal || c.canal === canal) &&
    (!estado || c.estado === estado)
  );

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>Gestión de clientes</h2>
        <div class="toolbar">
          <input id="buscar-clientes" placeholder="Buscar por nombre/celular" value="${escapeHtml(q)}" />
          <select id="filtro-canal-clientes"><option value="">Canal</option>${canalesBase.map(c => `<option ${canal===c?'selected':''}>${c}</option>`).join('')}</select>
          <select id="filtro-estado-clientes"><option value="">Estado</option>${['Activo','Pendiente','Inactivo'].map(s => `<option ${estado===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
      </div>

      <form id="cliente-form" class="toolbar">
        <input name="id" type="hidden" />
        <input name="nombre" placeholder="Nombre completo" required />
        <input name="celular" placeholder="Celular" required />
        <select name="canal" required>${canalesBase.map(c=>`<option>${c}</option>`).join('')}</select>
        <select name="estado" required>${['Activo','Pendiente','Inactivo'].map(s=>`<option>${s}</option>`).join('')}</select>
        <input name="fecha" type="date" required />
        <button>Guardar cliente</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Celular</th><th>Canal</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rows.map((c) => `
              <tr>
                <td>${c.nombre}</td><td>${c.celular}</td><td>${c.canal}</td><td>${statusBadge(c.estado)}</td><td>${c.fecha}</td>
                <td class="actions">
                  <button class="btn-secondary" data-action="edit-cliente" data-id="${c.id}">Editar</button>
                  <button class="btn-danger" data-action="delete-cliente" data-id="${c.id}">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProductos() {
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Catálogo de productos</h2></div>
      <form id="producto-form" class="toolbar">
        <input name="id" type="hidden" />
        <input name="nombre" placeholder="Nombre del producto" required />
        <input name="categoria" placeholder="Categoría" required />
        <input name="precio" type="number" min="0" step="0.01" placeholder="Precio" required />
        <input name="stock" type="number" min="0" placeholder="Stock" required />
        <button>Guardar producto</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
          <tbody>
            ${state.productos.map((p) => `
              <tr>
                <td>${p.nombre}</td><td>${p.categoria}</td><td>Bs ${Number(p.precio).toFixed(2)}</td><td>${p.stock}</td>
                <td class="actions">
                  <button class="btn-secondary" data-action="edit-producto" data-id="${p.id}">Editar</button>
                  <button class="btn-danger" data-action="delete-producto" data-id="${p.id}">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPedidos() {
  const estado = document.getElementById('filtro-estado-pedidos')?.value || '';
  const canal = document.getElementById('filtro-canal-pedidos')?.value || '';
  const rows = state.pedidos.filter((p) => (!estado || p.estado === estado) && (!canal || p.canal === canal));

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>Gestión de pedidos</h2>
        <div class="toolbar">
          <select id="filtro-estado-pedidos"><option value="">Filtrar estado</option>${['Nuevo','Pendiente','Confirmado','Enviado','Entregado'].map(s => `<option ${estado===s?'selected':''}>${s}</option>`).join('')}</select>
          <select id="filtro-canal-pedidos"><option value="">Filtrar canal</option>${canalesBase.map(c => `<option ${canal===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
      </div>

      <form id="pedido-form" class="toolbar">
        <input name="id" type="hidden" />
        <select name="clienteId" required>${state.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}</select>
        <select name="productoId" required>${state.productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}</select>
        <input name="monto" type="number" min="0" step="0.01" placeholder="Monto" required />
        <select name="estado" required>${['Nuevo','Pendiente','Confirmado','Enviado','Entregado'].map(s => `<option>${s}</option>`).join('')}</select>
        <input name="fecha" type="date" required />
        <select name="canal" required>${canalesBase.map(c=>`<option>${c}</option>`).join('')}</select>
        <button>Guardar pedido</button>
      </form>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Canal</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rows.map((p) => `
              <tr>
                <td>${clienteNombre(p.clienteId)}</td><td>${productoNombre(p.productoId)}</td><td>Bs ${Number(p.monto).toFixed(2)}</td>
                <td>${statusBadge(p.estado)}</td><td>${p.fecha}</td><td>${p.canal}</td>
                <td class="actions">
                  <button class="btn-secondary" data-action="edit-pedido" data-id="${p.id}">Editar</button>
                  <button class="btn-danger" data-action="delete-pedido" data-id="${p.id}">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCanales() {
  const stats = canalesBase.map((canal) => {
    const clientes = state.clientes.filter((c) => c.canal === canal).length;
    const pedidos = state.pedidos.filter((p) => p.canal === canal);
    return {
      canal,
      clientes,
      pedidos: pedidos.length,
      ventas: sum(pedidos.map((p) => Number(p.monto)))
    };
  });

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Rendimiento por canal</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Canal</th><th>Clientes captados</th><th>Pedidos generados</th><th>Ventas estimadas</th></tr></thead>
          <tbody>
            ${stats.map((s) => `<tr><td>${s.canal}</td><td>${s.clientes}</td><td>${s.pedidos}</td><td>Bs ${s.ventas.toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSeguimiento() {
  const funnelData = estadosSeguimiento.map((est) => ({ est, total: state.pedidos.filter((p) => p.seguimiento === est).length }));

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Flujo comercial y seguimiento</h2></div>
      <div class="funnel">
        ${funnelData.map(f => `<div class="funnel-step"><span>${f.est}</span><strong>${f.total}</strong></div>`).join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h2>Cambiar estado por pedido</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Pedido</th><th>Estado actual</th><th>Actualizar etapa</th></tr></thead>
          <tbody>
            ${state.pedidos.map((p) => `
              <tr>
                <td>${clienteNombre(p.clienteId)}</td>
                <td>${productoNombre(p.productoId)} - Bs ${Number(p.monto).toFixed(2)}</td>
                <td>${statusBadge(p.seguimiento || 'Nuevo contacto')}</td>
                <td>
                  <select data-action="change-seguimiento" data-id="${p.id}">
                    ${estadosSeguimiento.map((est) => `<option ${p.seguimiento===est?'selected':''}>${est}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReportes() {
  const pedidosPorCanal = canalesBase.map((canal) => ({ label: canal, value: state.pedidos.filter((p) => p.canal === canal).length }));
  const ventasPorEstado = ['Nuevo','Pendiente','Confirmado','Enviado','Entregado'].map((est) => ({
    label: est,
    value: sum(state.pedidos.filter((p) => p.estado === est).map((p) => Number(p.monto)))
  }));
  const clientesPorCanal = canalesBase.map((canal) => ({ label: canal, value: state.clientes.filter((c) => c.canal === canal).length }));

  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Pedidos por canal</h2></div>
      ${barChart(pedidosPorCanal)}
    </section>
    <section class="panel">
      <div class="panel-header"><h2>Ventas por estado</h2></div>
      ${barChart(ventasPorEstado, true)}
    </section>
    <section class="panel">
      <div class="panel-header"><h2>Clientes por canal</h2></div>
      ${barChart(clientesPorCanal)}
    </section>
  `;
}

function renderConfiguracion() {
  const c = state.config;
  viewContainer.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>Configuración básica</h2></div>
      <div class="config-grid">
        <article class="config-item"><small>Nombre del sistema</small><strong>${c.systemName}</strong></article>
        <article class="config-item"><small>Nombre del negocio</small><strong>${c.businessName}</strong></article>
        <article class="config-item"><small>Usuario demo</small><strong>${c.demoUser}</strong></article>
        <article class="config-item"><small>Modo demo</small><strong>${c.demoMode}</strong></article>
      </div>
    </section>
  `;
}

function saveCliente(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  if (payload.id) {
    state.clientes = state.clientes.map((c) => c.id === payload.id ? payload : c);
  } else {
    payload.id = uid();
    state.clientes.unshift(payload);
  }
  persist();
  renderClientes();
}

function saveProducto(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.precio = Number(payload.precio);
  payload.stock = Number(payload.stock);
  if (payload.id) {
    state.productos = state.productos.map((p) => p.id === payload.id ? payload : p);
  } else {
    payload.id = uid();
    state.productos.unshift(payload);
  }
  persist();
  renderProductos();
}

function savePedido(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.monto = Number(payload.monto);
  payload.seguimiento = payload.estado === 'Nuevo' ? 'Nuevo contacto' : payload.estado;
  if (payload.id) {
    state.pedidos = state.pedidos.map((p) => p.id === payload.id ? { ...p, ...payload } : p);
  } else {
    payload.id = uid();
    state.pedidos.unshift(payload);
  }
  persist();
  renderPedidos();
}

function removeItem(key, id) {
  state[key] = state[key].filter((item) => item.id !== id);
  persist();
  renderView(menu.querySelector('.menu-item.active')?.dataset.view || 'dashboard');
}

function fillForm(formId, data) {
  const form = document.getElementById(formId);
  if (!form || !data) return;
  Object.entries(data).forEach(([k, v]) => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = v;
  });
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

function getCanalPrincipal() {
  const counter = canalesBase.map((canal) => ({ canal, total: state.pedidos.filter((p) => p.canal === canal).length }));
  counter.sort((a, b) => b.total - a.total);
  return counter[0]?.canal || 'N/A';
}

function barChart(data, currency = false) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return `<div class="bar-chart">${data.map((d) => `
    <div class="bar-row">
      <span>${d.label}</span>
      <div class="bar"><i style="width:${(d.value / max) * 100}%"></i></div>
      <strong>${currency ? `Bs ${d.value.toFixed(2)}` : d.value}</strong>
    </div>
  `).join('')}</div>`;
}

function statusBadge(status) {
  const clean = status.toLowerCase().replace(/\s+/g, '-');
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
function titleCase(view) { return view.charAt(0).toUpperCase() + view.slice(1); }
function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
