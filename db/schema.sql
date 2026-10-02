CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    rol           VARCHAR(20)  NOT NULL DEFAULT 'solicitante'
                  CHECK (rol IN ('solicitante', 'tecnico', 'admin')),
    creado_en     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE incidencias (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    descripcion     TEXT         NOT NULL,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'abierta'
                    CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')),
    prioridad       VARCHAR(10)  NOT NULL DEFAULT 'media'
                    CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    reportado_por   INT NOT NULL REFERENCES usuarios(id),
    asignado_a      INT REFERENCES usuarios(id),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP NOT NULL DEFAULT NOW(),
    cerrado_en      TIMESTAMP
);

CREATE TABLE comentarios (
    id            SERIAL PRIMARY KEY,
    incidencia_id INT NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    usuario_id    INT NOT NULL REFERENCES usuarios(id),
    texto         TEXT NOT NULL,
    creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidencias_estado ON incidencias(estado);
CREATE INDEX idx_incidencias_asignado ON incidencias(asignado_a);
CREATE INDEX idx_comentarios_incidencia ON comentarios(incidencia_id);