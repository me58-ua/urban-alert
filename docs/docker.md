# 🐳 Despliegue con Docker

Urban Alert se empaqueta en **dos imágenes** publicadas en Docker Hub
(`naoufalcharafat/urban-alert`) y se orquesta con **Docker Compose** junto a una
PostgreSQL oficial. Cualquier persona puede levantar toda la app en local sin
instalar Python ni Node.

| Servicio | Imagen | Rol |
|---|---|---|
| `db` | `postgres:16-alpine` | Base de datos (volumen `pgdata`) |
| `backend` | `naoufalcharafat/urban-alert:backend` | API FastAPI (migra y arranca solo) |
| `frontend` | `naoufalcharafat/urban-alert:frontend` | nginx: SPA Angular + proxy `/api` y `/uploads` |

Solo se expone el **frontend** (`http://localhost:8080`). La API y la BD viven en
la red interna; el navegador habla únicamente con nginx (origen único, sin CORS).

## ▶️ Usar la app (para cualquiera)

```bash
# 1) Necesitas el docker-compose.yml y un .env (copia de .env.example).
cp .env.example .env          # y ajusta contraseñas/secretos

# 2) Levanta todo:
docker compose up -d

# 3) Abre la app:
#    http://localhost:8080
#    Admin inicial: BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD del .env
```

Parar / borrar:

```bash
docker compose down           # para los contenedores (conserva los datos)
docker compose down -v        # ⚠️ además borra los volúmenes (BD e imágenes subidas)
```

Los datos persisten en los volúmenes `pgdata` (BD) y `uploads` (imágenes subidas).

## 🚀 Publicar una nueva versión

### Opción A — GitHub Actions (recomendada)

El workflow [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml)
construye y publica ambas imágenes **multi-arquitectura** al crear un tag:

```bash
git tag v1.1.0
git push origin v1.1.0
```

Publica `:backend` + `:backend-1.1.0` y `:frontend` + `:frontend-1.1.0`.

Requiere dos *secrets* en el repo (Settings → Secrets and variables → Actions):
`DOCKERHUB_USERNAME` (= `naoufalcharafat`) y `DOCKERHUB_TOKEN` (Access Token de
Docker Hub con permiso *Read & Write*).

### Opción B — script local (manual)

```powershell
docker login                       # una sola vez
.\script\release.ps1 -Version 1.1.0
```

## 🛠️ Probar la build en local (con el código fuente)

```bash
docker build -t naoufalcharafat/urban-alert:backend  ./backend
docker build -t naoufalcharafat/urban-alert:frontend ./frontend
docker compose up -d
```
