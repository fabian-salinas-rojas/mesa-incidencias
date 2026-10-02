const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Listar incidencias
app.get('/incidencias', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.titulo, i.descripcion, i.estado, i.prioridad,
              u.nombre AS reportado_por, t.nombre AS asignado_a, i.creado_en
       FROM incidencias i
       JOIN usuarios u ON u.id = i.reportado_por
       LEFT JOIN usuarios t ON t.id = i.asignado_a
       ORDER BY i.creado_en DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar incidencias' });
  }
});

// Crear incidencia
app.post('/incidencias', async (req, res) => {
  const { titulo, descripcion, prioridad, reportado_por, asignado_a } = req.body;

  if (!titulo || !descripcion || !reportado_por) {
    return res.status(400).json({
      error: 'titulo, descripcion y reportado_por son obligatorios',
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO incidencias (titulo, descripcion, prioridad, reportado_por, asignado_a)
       VALUES ($1, $2, COALESCE($3, 'media'), $4, $5)
       RETURNING *`,
      [titulo, descripcion, prioridad, reportado_por, asignado_a || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'No se pudo crear la incidencia (revisa prioridad y usuarios)' });
  }
});

// Ver una incidencia con sus comentarios
app.get('/incidencias/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    const inc = await pool.query(
      `SELECT i.*, u.nombre AS reportado_por_nombre, t.nombre AS asignado_a_nombre
       FROM incidencias i
       JOIN usuarios u ON u.id = i.reportado_por
       LEFT JOIN usuarios t ON t.id = i.asignado_a
       WHERE i.id = $1`,
      [id]
    );
    if (inc.rows.length === 0) return res.status(404).json({ error: 'Incidencia no encontrada' });

    const com = await pool.query(
      `SELECT c.id, c.texto, c.creado_en, u.nombre AS usuario
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.incidencia_id = $1
       ORDER BY c.creado_en`,
      [id]
    );
    res.json({ ...inc.rows[0], comentarios: com.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la incidencia' });
  }
});

// Cambiar estado, prioridad o técnico asignado
app.patch('/incidencias/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  const { estado, prioridad, asignado_a } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE incidencias SET
         estado = COALESCE($1, estado),
         prioridad = COALESCE($2, prioridad),
         asignado_a = COALESCE($3, asignado_a),
         actualizado_en = NOW(),
         cerrado_en = CASE WHEN COALESCE($1, estado) = 'cerrada'
                           THEN COALESCE(cerrado_en, NOW()) ELSE NULL END
       WHERE id = $4
       RETURNING *`,
      [estado || null, prioridad || null, asignado_a || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Incidencia no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'No se pudo actualizar (revisa estado, prioridad y usuario)' });
  }
});

// Agregar un comentario
app.post('/incidencias/:id/comentarios', async (req, res) => {
  const id = Number(req.params.id);
  const { usuario_id, texto } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
  if (!usuario_id || !texto) {
    return res.status(400).json({ error: 'usuario_id y texto son obligatorios' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO comentarios (incidencia_id, usuario_id, texto)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, usuario_id, texto]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'No se pudo agregar el comentario (revisa la incidencia y el usuario)' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
}

module.exports = app;