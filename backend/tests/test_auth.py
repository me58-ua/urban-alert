def test_register_y_login(client):
    # Registro de un ciudadano
    res = client.post("/auth/register", json={"email": "user1@test.com", "password": "secret123"})
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "user1@test.com"
    assert data["rol"] == "ciudadano"

    # Email duplicado -> 400
    res_dup = client.post("/auth/register", json={"email": "user1@test.com", "password": "secret123"})
    assert res_dup.status_code == 400

    # Login correcto -> JWT
    res_login = client.post("/auth/login", data={"username": "user1@test.com", "password": "secret123"})
    assert res_login.status_code == 200
    body = res_login.json()
    assert body["token_type"] == "bearer"
    token = body["access_token"]
    assert token

    # /me con token válido
    res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "user1@test.com"


def test_login_credenciales_invalidas(client):
    client.post("/auth/register", json={"email": "user2@test.com", "password": "secret123"})
    res = client.post("/auth/login", data={"username": "user2@test.com", "password": "incorrecta"})
    assert res.status_code == 401


def test_me_sin_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_token_invalido(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer token.no.valido"})
    assert res.status_code == 401


def test_token_expirado(client):
    from security import create_access_token

    # Token ya caducado (exp en el pasado)
    token = create_access_token(subject="x@test.com", rol="ciudadano", expires_minutes=-1)
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_registro_publico_no_crea_admin(client):
    res = client.post("/auth/register", json={"email": "intruso@test.com", "password": "secret123"})
    assert res.status_code == 201
    assert res.json()["rol"] == "ciudadano"
