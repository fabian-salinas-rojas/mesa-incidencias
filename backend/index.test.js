const request = require('supertest');
const app = require('./index');
const pool = require('./db');

const creadas = []; // ids de incidencias creadas por los tests, para limpiarlas al final
let incId;          // incidencia base para GET, PATCH y comentarios

beforeAll(async () => {
  const { rows } = await pool.query(
    `INSERT INTO incidencias (titulo, descripcion, prioridad, reportado_por)
     VALUES ('Test base', 'Incidencia creada por Jest', 'media', 1)
     RETURNING id`
  );
  incId = rows[0].id;
  creadas.push(incId);
});

afterAll(async () => {
  await pool.query('DELETE FROM comentarios WHERE incidencia_id = ANY($1)', [creadas]);
  await pool.query('DELETE FROM incidencias WHERE id = ANY($1)', [creadas]);
  await pool.end();
});

// Silencia los console.error esperados en los casos de error
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('GET /incidencias', () => {
  test('200 y devuelve una lista', async () => {
    const res = await request(app).get('/incidencias');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('POST /incidencias', () => {
  test('201 crea una incidencia con prioridad por defecto', async () => {
    const res = await request(app).post('/incidencias').send({
      titulo: 'Test crear',
      descripcion: 'Creada desde Jest',
      reportado_por: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe('Test crear');
    expect(res.body.prioridad).toBe('media');
    creadas.push(res.body.id);
  });

  test('400 si faltan campos obligatorios', async () => {
    const res = await request(app).post('/incidencias').send({ titulo: 'Solo título' });
    expect(res.status).toBe(400);
  });

  test('400 si la prioridad es inválida', async () => {
    const res = await request(app).post('/incidencias').send({
      titulo: 'X',
      descripcion: 'Y',
      prioridad: 'inexistente',
      reportado_por: 1,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /incidencias/:id', () => {
  test('200 devuelve la incidencia con comentarios', async () => {
    const res = await request(app).get(`/incidencias/${incId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(incId);
    expect(Array.isArray(res.body.comentarios)).toBe(true);
  });

  test('404 si no existe', async () => {
    const res = await request(app).get('/incidencias/999999');
    expect(res.status).toBe(404);
  });

  test('400 si el id no es numérico', async () => {
    const res = await request(app).get('/incidencias/abc');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /incidencias/:id', () => {
  test('200 cambia estado y técnico asignado', async () => {
    const res = await request(app)
      .patch(`/incidencias/${incId}`)
      .send({ estado: 'en_proceso', asignado_a: 2 });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('en_proceso');
    expect(res.body.asignado_a).toBe(2);
  });

  test('200 al cerrar rellena cerrado_en', async () => {
    const res = await request(app).patch(`/incidencias/${incId}`).send({ estado: 'cerrada' });
    expect(res.status).toBe(200);
    expect(res.body.cerrado_en).not.toBeNull();
  });

  test('400 si el estado es inválido', async () => {
    const res = await request(app).patch(`/incidencias/${incId}`).send({ estado: 'inventado' });
    expect(res.status).toBe(400);
  });

  test('404 si la incidencia no existe', async () => {
    const res = await request(app).patch('/incidencias/999999').send({ estado: 'abierta' });
    expect(res.status).toBe(404);
  });
});

describe('POST /incidencias/:id/comentarios', () => {
  test('201 agrega un comentario', async () => {
    const res = await request(app)
      .post(`/incidencias/${incId}/comentarios`)
      .send({ usuario_id: 2, texto: 'Comentario de prueba' });
    expect(res.status).toBe(201);
    expect(res.body.texto).toBe('Comentario de prueba');
  });

  test('400 si falta el texto', async () => {
    const res = await request(app)
      .post(`/incidencias/${incId}/comentarios`)
      .send({ usuario_id: 2 });
    expect(res.status).toBe(400);
  });

  test('400 si la incidencia no existe', async () => {
    const res = await request(app)
      .post('/incidencias/999999/comentarios')
      .send({ usuario_id: 2, texto: 'Hola' });
    expect(res.status).toBe(400);
  });
});