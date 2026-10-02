(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const ESTADOS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
  const ETIQUETAS = { abierta: 'Abierta', en_proceso: 'En proceso', resuelta: 'Resuelta', cerrada: 'Cerrada' };
  const tabla = $('#tabla');
  const vacio = $('#vacio');
  const wrap = $('.tabla-wrap');
  const filtro = { estado: 'todas', prio: 'todas', q: '' };
  let falloCarga = false;

  /* ---------- Lectura de filas (las dibuja app.js) ---------- */
  const filas = () => $$('tr:not([data-skeleton])', tabla);

  function leerFila(tr) {
    const c = tr.cells;
    if (c.length < 6) return;
    const sel = $('select', tr);
    tr.dataset.estado = sel ? sel.value : c[5].textContent.trim();
    tr.dataset.prio = norm(c[2].textContent.trim());
    tr.dataset.q = norm([0, 1, 3, 4].map((i) => c[i].textContent).join(' '));
    if (sel) {
      // Solo cambia el texto visible; el value (lo que se envía a la API) queda igual
      $$('option', sel).forEach((o) => { if (ETIQUETAS[o.value]) o.textContent = ETIQUETAS[o.value]; });
    }
    if (sel && !sel.getAttribute('aria-label')) {
      sel.setAttribute('aria-label', `Estado de la incidencia ${c[0].textContent.trim()}`);
    }
  }

  /* ---------- Estados vacíos ---------- */
  const VACIOS = {
    primero: ['Aún no hay incidencias', 'Crea la primera para empezar a darle seguimiento.', 'Crear incidencia', 'crear'],
    filtrado: ['Ninguna incidencia coincide', 'Prueba con otra búsqueda o quita los filtros.', 'Limpiar filtros', 'limpiar'],
    fallo: ['No pudimos cargar las incidencias', 'Comprueba que la API esté en marcha (node index.js) y vuelve a intentarlo.', 'Reintentar', 'reintentar'],
  };

  function mostrarVacio(tipo) {
    if (!tipo) { vacio.hidden = true; return; }
    const [h, p, b, a] = VACIOS[tipo];
    vacio.innerHTML = `<h3>${h}</h3><p>${p}</p><button type="button" class="btn" data-accion="${a}">${b}</button>`;
    vacio.hidden = false;
  }

  /* ---------- Render principal ---------- */
  function actualizar() {
    const todas = filas();
    todas.forEach(leerFila);
    if (todas.length) { falloCarga = false; wrap.setAttribute('aria-busy', 'false'); }

    const cuenta = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
    todas.forEach((tr) => { if (tr.dataset.estado in cuenta) cuenta[tr.dataset.estado]++; });

    $$('.chip').forEach((b) => {
      const e = b.dataset.estado;
      $('.n', b).textContent = e === 'todas' ? todas.length : cuenta[e];
      b.setAttribute('aria-pressed', String(filtro.estado === e));
    });
    $$('.barra span').forEach((s) => {
      const n = cuenta[s.dataset.estado];
      s.style.flexGrow = n;
      s.hidden = n === 0; // sin segmento vacío, no queda hueco entre barras
    });

    let visibles = 0;
    todas.forEach((tr) => {
      const ok =
        (filtro.estado === 'todas' || tr.dataset.estado === filtro.estado) &&
        (filtro.prio === 'todas' || tr.dataset.prio === filtro.prio) &&
        (!filtro.q || (tr.dataset.q || '').includes(filtro.q));
      tr.hidden = !ok;
      if (ok) visibles++;
    });

    const cargando = $('tr[data-skeleton]', tabla);
    if (cargando) mostrarVacio(null);
    else if (falloCarga && !todas.length) mostrarVacio('fallo');
    else if (!todas.length) mostrarVacio('primero');
    else if (!visibles) mostrarVacio('filtrado');
    else mostrarVacio(null);

    $('#conteo').textContent = cargando ? '' : `${visibles} de ${todas.length}`;
  }

  new MutationObserver(actualizar).observe(tabla, { childList: true });
  tabla.addEventListener('change', () => setTimeout(actualizar, 0));

  // Si tras 8 s siguen los esqueletos, la API no respondió
  setTimeout(() => {
    if ($('tr[data-skeleton]', tabla)) {
      falloCarga = true;
      $$('tr[data-skeleton]', tabla).forEach((tr) => tr.remove());
      wrap.setAttribute('aria-busy', 'false');
      actualizar();
    }
  }, 8000);

  /* ---------- Filtros ---------- */
  $$('.chip').forEach((b) => b.addEventListener('click', () => { filtro.estado = b.dataset.estado; actualizar(); }));
  $('#buscar').addEventListener('input', (e) => { filtro.q = norm(e.target.value.trim()); actualizar(); });
  $('#f-prioridad').addEventListener('change', (e) => { filtro.prio = e.target.value; actualizar(); });

  function limpiarFiltros() {
    filtro.estado = 'todas'; filtro.prio = 'todas'; filtro.q = '';
    $('#buscar').value = ''; $('#f-prioridad').value = 'todas';
    actualizar();
  }

  /* ---------- Panel lateral ---------- */
  const dlg = $('#dlg');
  const form = $('#form-nueva');
  const abrir = () => { dlg.showModal(); $('#titulo').focus(); };
  const cerrar = () => dlg.close(); // el navegador devuelve el foco al botón que lo abrió

  $('#cancelar').addEventListener('click', cerrar);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrar(); }); // clic en el fondo

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-accion]')?.dataset.accion;
    if (a === 'crear') abrir();
    if (a === 'limpiar') limpiarFiltros();
    if (a === 'reintentar') location.reload();
  });

  /* ---------- Validación: al salir del campo, nunca mientras se escribe ---------- */
  const REGLAS = {
    titulo: (v) => (v.trim() ? '' : 'Escribe un título breve, por ejemplo: Sin acceso a la VPN.'),
    descripcion: (v) => (v.trim() ? '' : 'Describe qué ocurre para que soporte pueda ayudar.'),
    reportado_por: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1 ? '' : 'Ingresa el ID del usuario: un número entero desde 1.'),
  };

  function validar(id) {
    const campo = $('#' + id);
    const msg = REGLAS[id](campo.value);
    const out = $('#err-' + id);
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    out.textContent = msg;
    out.hidden = !msg;
    return !msg;
  }
  function limpiarError(id) {
    $('#' + id).removeAttribute('aria-invalid');
    $('#err-' + id).hidden = true;
  }

  Object.keys(REGLAS).forEach((id) => {
    const campo = $('#' + id);
    campo.addEventListener('blur', () => validar(id));
    campo.addEventListener('focus', () => limpiarError(id));
    campo.addEventListener('input', () => limpiarError(id));
  });

  // Captura: corre antes que el submit de app.js (ux.js se carga primero)
  form.addEventListener('submit', (e) => {
    const malos = Object.keys(REGLAS).filter((id) => !validar(id));
    if (malos.length) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $('#' + malos[0]).focus();
    }
  }, true);

  /* ---------- Borrador y últimos valores usados ---------- */
  const KEY = 'mesa-incidencias:borrador';
  const CAMPOS = ['titulo', 'descripcion', 'prioridad', 'reportado_por'];
  let t;

  const guardar = () => {
    const d = {};
    CAMPOS.forEach((id) => { d[id] = $('#' + id).value; });
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* sin almacenamiento: se ignora */ }
  };
  form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(guardar, 500); });

  function restaurar() {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { d = null; }
    if (!d) return;
    CAMPOS.forEach((id) => { if (d[id] !== undefined && d[id] !== '') $('#' + id).value = d[id]; });
    if (d.titulo || d.descripcion) $('#borrador').hidden = false;
  }
  restaurar();

  $('#descartar').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
    form.reset();
    CAMPOS.forEach((id) => limpiarError(id));
    $('#borrador').hidden = true;
    $('#titulo').focus();
  });

  /* ---------- Resultado del envío (app.js escribe en #mensaje) ---------- */
  const msg = $('#mensaje');
  const toast = $('#toast');
  let tt;

  new MutationObserver(() => setTimeout(() => {
    if (!msg.classList.contains('ok') || !msg.textContent.trim()) return;
    const texto = msg.textContent.trim();

    const prioridad = $('#prioridad').value;
    const rep = $('#reportado_por').value;
    form.reset();
    $('#prioridad').value = prioridad;   // recuerda lo último usado
    $('#reportado_por').value = rep;
    guardar();
    $('#titulo').value = ''; $('#descripcion').value = ''; guardar();
    $('#borrador').hidden = true;

    msg.textContent = ''; msg.className = 'mensaje';
    if (dlg.open) cerrar();

    toast.textContent = texto;
    toast.hidden = false;
    clearTimeout(tt);
    tt = setTimeout(() => { toast.hidden = true; }, 4000);
  }, 0)).observe(msg, { childList: true, characterData: true, subtree: true, attributes: true });

  actualizar();
})();