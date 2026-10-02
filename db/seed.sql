INSERT INTO usuarios (nombre, email, rol) VALUES
('Ana Torres', 'ana@empresa.com', 'solicitante'),
('Luis Pérez', 'luis@empresa.com', 'tecnico');

INSERT INTO incidencias (titulo, descripcion, prioridad, reportado_por, asignado_a) VALUES
('No abre el correo', 'Outlook se cierra al iniciar.', 'alta', 1, 2);

INSERT INTO comentarios (incidencia_id, usuario_id, texto) VALUES
(1, 2, 'Revisando el perfil de Outlook.');

SELECT i.id, i.titulo, i.estado, u.nombre AS reportado_por
FROM incidencias i
JOIN usuarios u ON u.id = i.reportado_por;