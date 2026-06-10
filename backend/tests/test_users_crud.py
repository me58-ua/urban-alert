"""Tests del CRUD admin de usuarios + estado activo/bloqueo de login (issue #34)."""


def test_crear_usuario_admin(client, admin_headers):
    """POST /users crea un usuario con el rol indicado (201, activo=true)."""
    res = client.post(
        "/users",
        json={"email": "nuevo@test.com", "password": "password123", "rol": "admin"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "nuevo@test.com"
    assert data["rol"] == "admin"
    assert data["activo"] is True


def test_crear_usuario_rol_por_defecto_ciudadano(client, admin_headers):
    """POST /users sin rol explícito crea un ciudadano."""
    res = client.post(
        "/users",
        json={"email": "poromdefecto@test.com", "password": "password123"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    assert res.json()["rol"] == "ciudadano"


def test_crear_usuario_email_duplicado_400(client, admin_headers):
    """POST /users con email ya existente -> 400."""
    payload = {"email": "dup@test.com", "password": "password123"}
    assert client.post("/users", json=payload, headers=admin_headers).status_code == 201
    res = client.post("/users", json=payload, headers=admin_headers)
    assert res.status_code == 400


def test_editar_email_usuario(client, admin_headers, crear_usuario):
    """PATCH /users/{id} cambia el email."""
    user = crear_usuario("editame@test.com")
    res = client.patch(
        f"/users/{user.id}",
        json={"email": "editado@test.com"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["email"] == "editado@test.com"


def test_eliminar_usuario(client, admin_headers, crear_usuario):
    """DELETE /users/{id} elimina (204) y luego responde 404."""
    user = crear_usuario("borrame@test.com")
    res = client.delete(f"/users/{user.id}", headers=admin_headers)
    assert res.status_code == 204

    # Volver a operar sobre él -> 404 (ya no existe).
    res2 = client.patch(
        f"/users/{user.id}", json={"email": "x@test.com"}, headers=admin_headers
    )
    assert res2.status_code == 404


def test_eliminar_propia_cuenta_400(client, admin_headers, db_session):
    """DELETE de tu propia cuenta -> 400 (guard de auto-borrado)."""
    from models import User

    admin = db_session.query(User).filter(User.email == "admin@test.com").first()
    res = client.delete(f"/users/{admin.id}", headers=admin_headers)
    assert res.status_code == 400


def test_desactivar_usuario(client, admin_headers, crear_usuario):
    """PATCH /users/{id}/estado desactiva (activo=false)."""
    user = crear_usuario("desactivame@test.com")
    res = client.patch(
        f"/users/{user.id}/estado", json={"activo": False}, headers=admin_headers
    )
    assert res.status_code == 200
    assert res.json()["activo"] is False


def test_usuario_desactivado_no_puede_loguear(client, admin_headers):
    """Un usuario desactivado NO puede hacer login (POST /auth/login -> 401)."""
    # Lo creamos vía POST /users (password conocido y hasheado correctamente).
    crear = client.post(
        "/users",
        json={"email": "bloqueado@test.com", "password": "password123"},
        headers=admin_headers,
    )
    assert crear.status_code == 201
    user_id = crear.json()["id"]

    # Antes de desactivar, el login funciona.
    login_ok = client.post(
        "/auth/login",
        data={"username": "bloqueado@test.com", "password": "password123"},
    )
    assert login_ok.status_code == 200

    # Desactivamos.
    res = client.patch(
        f"/users/{user_id}/estado", json={"activo": False}, headers=admin_headers
    )
    assert res.status_code == 200
    assert res.json()["activo"] is False

    # Ahora el login es rechazado.
    login_ko = client.post(
        "/auth/login",
        data={"username": "bloqueado@test.com", "password": "password123"},
    )
    assert login_ko.status_code == 401


def test_desactivar_propia_cuenta_400(client, admin_headers, db_session):
    """Desactivarte a ti mismo -> 400 (guard de auto-desactivación)."""
    from models import User

    admin = db_session.query(User).filter(User.email == "admin@test.com").first()
    res = client.patch(
        f"/users/{admin.id}/estado", json={"activo": False}, headers=admin_headers
    )
    assert res.status_code == 400


def test_crud_requiere_admin(client, ciudadano_headers, crear_usuario):
    """Un NO-admin (ciudadano) recibe 403 en todos los endpoints del CRUD."""
    user = crear_usuario("victima@test.com")

    assert client.post(
        "/users",
        json={"email": "x2@test.com", "password": "password123"},
        headers=ciudadano_headers,
    ).status_code == 403
    assert client.patch(
        f"/users/{user.id}", json={"email": "y@test.com"}, headers=ciudadano_headers
    ).status_code == 403
    assert client.delete(
        f"/users/{user.id}", headers=ciudadano_headers
    ).status_code == 403
    assert client.patch(
        f"/users/{user.id}/estado", json={"activo": False}, headers=ciudadano_headers
    ).status_code == 403
