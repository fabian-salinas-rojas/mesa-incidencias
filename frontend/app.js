const tabla = document.getElementById('tabla');
const form = document.getElementById('form-nueva');
const mensaje = document.getElementById('mensaje');

const ESTADOS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + tipo;
}

// Evita inyectar HTML desde los datos de la API
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

async function cargarIncidencias() {
  try {
    const res = await fetch('/incidencias');
    const datos = await res.json();

    tabla.innerHTML = datos.map((i) => `
      <tr>
        <td>${i.id}</td>
        <td>${escapar(i.titulo)}</td>
        <td><span class="prio ${i.prioridad}">${i.prioridad}</span></td>
        <td>${escapar(i.reportado_por)}</td>
        <td>${escapar(i.asignado_a) || '-'}</td>
        <td>
          <select data-id="${i.id}" class="cambiar-estado">
            ${ESTADOS.map((e) =>
              `<option value="${e}" ${e === i.estado ? 'selected' : ''}>${e}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    mostrarMensaje('No se pudo cargar la lista de incidencias', 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cuerpo = {
    titulo: document.getElementById('titulo').value,
    descripcion: document.getElementById('descripcion').value,
    prioridad: document.getElementById('prioridad').value,
    reportado_por: Number(document.getElementById('reportado_por').value),
  };

  try {
    const res = await fetch('/incidencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const datos = await res.json();

    if (!res.ok) {
      mostrarMensaje(datos.error || 'Error al crear la incidencia', 'error');
      return;
    }

    mostrarMensaje('Incidencia creada', 'ok');
    form.reset();
    document.getElementById('reportado_por').value = 1;
    cargarIncidencias();
  } catch (err) {
    mostrarMensaje('No se pudo conectar con la API', 'error');
  }
});

// Cambiar el estado desde la tabla
tabla.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('cambiar-estado')) return;

  const id = e.target.dataset.id;
  try {
    const res = await fetch(`/incidencias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: e.target.value }),
    });
    if (!res.ok) {
      const datos = await res.json();
      mostrarMensaje(datos.error || 'No se pudo cambiar el estado', 'error');
    } else {
      mostrarMensaje(`Incidencia ${id} actualizada`, 'ok');
    }
  } catch (err) {
    mostrarMensaje('No se pudo conectar con la API', 'error');
  }
});

cargarIncidencias();