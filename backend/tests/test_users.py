def test_listar_usuarios_requiere_admin(client, ciudadano_headers):
    assert client.get("/users").status_code == 401                       # sin token
    assert client.get("/users", headers=ciudadano_headers).status_code == 403  # rol insuficiente


def test_admin_lista_usuarios(client, admin_headers):
    res = client.get("/users", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert "limit" in data and "offset" in data
    assert any(u["rol"] == "admin" for u in data["items"])


def test_admin_promueve_a_admin(client, admin_headers, crear_usuario):
    from models import RolEnum
    user = crear_usuario("promo@test.com", rol=RolEnum.ciudadano)

    res = client.patch(f"/users/{user.id}/rol", json={"rol": "admin"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["rol"] == "admin"


def test_cambiar_rol_no_admin_403(client, ciudadano_headers, crear_usuario):
    user = crear_usuario("otro@test.com")
    r = client.patch(f"/users/{user.id}/rol", json={"rol": "admin"}, headers=ciudadano_headers)
    assert r.status_code == 403


def test_cambiar_rol_usuario_inexistente_404(client, admin_headers):
    r = client.patch("/users/999999/rol", json={"rol": "admin"}, headers=admin_headers)
    assert r.status_code == 404


def test_admin_no_cambia_su_propio_rol(client, admin_headers, db_session):
    from models import User
    admin = db_session.query(User).filter(User.email == "admin@test.com").first()
    r = client.patch(f"/users/{admin.id}/rol", json={"rol": "ciudadano"}, headers=admin_headers)
    assert r.status_code == 400  # auto-bloqueo


def test_crear_admin_inicial_servicio(db_session):
    import services.usuarios as usuarios_service
    from models import User, RolEnum
    from security import hash_password

    # No existe -> lo crea como admin
    u = usuarios_service.crear_admin_inicial(db_session, "boot@test.com", "secret123")
    assert u.rol == RolEnum.admin

    # Ya existe como ciudadano -> lo promueve (mismo id)
    existente = User(email="ya@test.com", hashed_password=hash_password("x"), rol=RolEnum.ciudadano)
    db_session.add(existente)
    db_session.commit()
    u2 = usuarios_service.crear_admin_inicial(db_session, "ya@test.com", "otra")
    assert u2.id == existente.id
    assert u2.rol == RolEnum.admin
