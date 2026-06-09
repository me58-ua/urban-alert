# 🚀 Scripts de despliegue

Scripts para levantar **Urban Alert** (backend + frontend) en local.

## `deploy.ps1`

Despliega todo el stack en `localhost`:

```powershell
# Desde la raíz del proyecto:
.\script\deploy.ps1
```

Hace lo siguiente:

1. ✅ Comprueba que `python`, `node` y `npm` están en el PATH.
2. 🔌 Verifica que los puertos del **backend** y **frontend** están libres; si alguno está ocupado, **aborta con un mensaje claro** indicando el PID que lo retiene.
3. 🐘 Levanta **PostgreSQL en un contenedor Docker dedicado** (`urban-alert-db`):
   - Si el contenedor ya existe, lo arranca; si no, lo crea (imagen `postgres:latest`,
     usuario `admin`/`adminpassword`, BD `incidencias_db`, volumen persistente `urban_alert_pgdata`).
   - Usa el puerto **5433** por defecto (para no chocar con un PostgreSQL nativo en `:5432`).
   - Espera a que la BD acepte conexiones antes de continuar. Requiere **Docker en marcha**.
4. 📦 Instala dependencias que falten (`venv` de Python + `node_modules`).
5. 🗃️ Aplica migraciones con `alembic upgrade head` y exporta `DATABASE_URL` apuntando al contenedor.
6. ▶️ Arranca **uvicorn** y **ng serve**, cada uno en su propia ventana.

### Opciones

| Parámetro | Descripción | Por defecto |
|---|---|---|
| `-BackendPort` | Puerto del backend FastAPI | `8000` |
| `-FrontendPort` | Puerto del frontend Angular/Ionic | `4200` |
| `-DbPort` | Puerto host de PostgreSQL (contenedor) | `5433` |
| `-SkipInstall` | No instala dependencias | — |
| `-SkipDb` | No gestiona la base de datos | — |

### Gestión del contenedor de BD

```powershell
docker ps                              # ver el contenedor urban-alert-db
docker stop urban-alert-db             # detener la BD
docker start urban-alert-db            # arrancar la BD
docker exec -it urban-alert-db psql -U admin -d incidencias_db   # consola SQL
docker rm -f urban-alert-db; docker volume rm urban_alert_pgdata # borrar BD y datos (DESTRUCTIVO)
```

### Ejemplos

```powershell
# Usar otros puertos
.\script\deploy.ps1 -BackendPort 8001 -FrontendPort 4300

# Saltar instalación de dependencias (arranque rápido)
.\script\deploy.ps1 -SkipInstall

# La BD ya está accesible por otra vía
.\script\deploy.ps1 -SkipDb
```

### URLs

- **API / Swagger**: http://localhost:8000/docs
- **Frontend**: http://localhost:4200

> ⚠️ Si PowerShell bloquea el script por la *Execution Policy*, ejecútalo así:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\script\deploy.ps1
> ```
