# Mesa de Incidencias

![Tests](https://github.com/fabian-salinas-rojas/mesa-incidencias/actions/workflows/test.yml/badge.svg)

API REST para registrar y dar seguimiento a incidencias de soporte técnico.
Permite crear incidencias, asignarlas a técnicos, cambiar su estado y
prioridad, y agregar comentarios de seguimiento.

**Estado:** en desarrollo.

## Índice

*   [Contacto](#contacto)
*   [Tecnologías](#tecnologías)
*   [Estructura del proyecto](#estructura-del-proyecto)
*   [Instalación](#instalación)
*   [Uso](#uso)
*   [API](#api)
*   [Próximos pasos](#próximos-pasos)
*   [Licencia](#licencia)

## Contacto

*   Autor: Fabian Salinas Rojas
*   GitHub: [fabian-salinas-rojas](https://github.com/fabian-salinas-rojas)
*   LinkedIn: [Fabián Salinas Rojas](https://www.linkedin.com/in/fabian-armando-salinas-rojas-205849404/)

## Tecnologías

*   [Node.js](https://nodejs.org/) y [Express](https://expressjs.com/)
*   [PostgreSQL 16](https://www.postgresql.org/) con
    [Docker Compose](https://docs.docker.com/compose/)
*   Librerías [`pg`](https://node-postgres.com/) y
    [`dotenv`](https://github.com/motdotla/dotenv)
*   Pruebas con [Jest](https://jestjs.io/) y
    [Supertest](https://github.com/ladjs/supertest)

## Estructura del proyecto

```text
mesa-incidencias/
├── backend/            API (db.js, index.js)
├── db/
│   ├── schema.sql      Tablas e índices
│   └── seed.sql        Datos de prueba
├── docker-compose.yml  Base de datos PostgreSQL
└── .env.example        Variables de entorno de ejemplo
```

## Instalación

Los comandos están escritos para Windows (cmd).

Requisitos:

*   Node.js
*   Docker y Docker Compose
*   Un cliente SQL (por ejemplo, DBeaver)

Pasos:

1.  Clona el repositorio.

    ```bat
    git clone https://github.com/fabian-salinas-rojas/mesa-incidencias.git
    cd mesa-incidencias
    ```

2.  Crea el archivo `.env` a partir del ejemplo y define tu contraseña en
    `POSTGRES_PASSWORD`.

    ```bat
    copy .env.example .env
    ```

3.  Levanta la base de datos. Queda publicada en el puerto `5433`.

    ```bat
    docker compose up -d
    ```

4.  Ejecuta `db/schema.sql` y luego `db/seed.sql` en tu cliente SQL con esta
    conexión:

    *   Host: `127.0.0.1`
    *   Puerto: `5433`
    *   Base de datos: `incidencias_db`

5.  Instala las dependencias de la API.

    ```bat
    cd backend
    npm install
    ```

## Uso

Inicia la API desde la carpeta `backend`:

```bat
node index.js
```

La API queda disponible en `http://localhost:3000`.

Crear una incidencia:

```bat
curl -X POST http://localhost:3000/incidencias -H "Content-Type: application/json" -d "{\"titulo\":\"Sin internet\",\"descripcion\":\"No hay red en el piso 2\",\"prioridad\":\"alta\",\"reportado_por\":1}"
```

Asignar un técnico y cambiar el estado:

```bat
curl -X PATCH http://localhost:3000/incidencias/2 -H "Content-Type: application/json" -d "{\"estado\":\"en_proceso\",\"asignado_a\":2}"
```

Agregar un comentario:

```bat
curl -X POST http://localhost:3000/incidencias/2/comentarios -H "Content-Type: application/json" -d "{\"usuario_id\":2,\"texto\":\"Revisando el switch del piso 2\"}"
```

## API

### Endpoints

Método | Ruta                           | Descripción
------ | ------------------------------ | -------------------------------------
GET    | `/incidencias`                 | Lista todas las incidencias
GET    | `/incidencias/:id`             | Detalle de una incidencia con comentarios
POST   | `/incidencias`                 | Crea una incidencia
PATCH  | `/incidencias/:id`             | Cambia estado, prioridad o técnico asignado
POST   | `/incidencias/:id/comentarios` | Agrega un comentario

### Códigos de respuesta

*   `200` y `201`: operación exitosa.
*   `400`: datos inválidos o faltantes.
*   `404`: incidencia no encontrada.
*   `500`: error interno del servidor.

### Modelo de datos

El esquema completo está en [`db/schema.sql`](db/schema.sql).

*   `usuarios`: solicitantes, técnicos y administradores.
*   `incidencias`: título, descripción, estado, prioridad, usuario que
    reporta y técnico asignado.
*   `comentarios`: seguimiento de cada incidencia.

Valores permitidos:

*   Estado: `abierta`, `en_proceso`, `resuelta`, `cerrada`.
*   Prioridad: `baja`, `media`, `alta`, `critica`.

## Pruebas

Con la base de datos levantada:

```
cd backend
npm test
```

Las pruebas también se ejecutan automáticamente en cada push con GitHub
Actions (ver `.github/workflows/test.yml`).

## Próximos pasos

*   Frontend para gestionar las incidencias.

## Licencia

Sin licencia definida.