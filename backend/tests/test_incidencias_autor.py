"""Tests del autor de incidencias y del endpoint "mis incidencias" (issue #33)."""
from models import RolEnum
from security import create_access_token


def _headers_de(crear_usuario, email):
    """Crea (o recupera) un usuario ciudadano y devuelve su id + cabeceras Bearer."""
    user = crear_usuario(email, rol=RolEnum.ciudadano)
    token = create_access_token(subject=user.email, rol="ciudadano")
    return user.id, {"Authorization": f"Bearer {token}"}


def _payload(titulo):
    return {
        "titulo": titulo,
        "categoria": "otro",
        "latitud": 1.0,
        "longitud": 1.0,
    }


def test_post_autenticado_asocia_autor(client, crear_usuario):
    """(a) POST autenticado crea la incidencia con user_id = id del usuario."""
    user_id, headers = _headers_de(crear_usuario, "autor.a@test.com")

    res = client.post("/incidencias", json=_payload("Con autor"), headers=headers)
    assert res.status_code == 201
    assert res.json()["user_id"] == user_id


def test_post_anonimo_user_id_null(client):
    """(b) POST sin auth crea la incidencia con user_id null."""
    res = client.post("/incidencias", json=_payload("Anonima"))
    assert res.status_code == 201
    assert res.json()["user_id"] is None


def test_mias_filtra_por_autor(client, crear_usuario):
    """(c) GET /incidencias/mias devuelve SOLO las del usuario actual."""
    id_a, headers_a = _headers_de(crear_usuario, "mias.a@test.com")
    id_b, headers_b = _headers_de(crear_usuario, "mias.b@test.com")

    # 2 incidencias del usuario A, 1 del usuario B y 1 anónima.
    client.post("/incidencias", json=_payload("A-1"), headers=headers_a)
    client.post("/incidencias", json=_payload("A-2"), headers=headers_a)
    client.post("/incidencias", json=_payload("B-1"), headers=headers_b)
    client.post("/incidencias", json=_payload("Anon"))

    res_a = client.get("/incidencias/mias", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total"] == 2
    assert len(data_a["items"]) == 2
    assert all(item["user_id"] == id_a for item in data_a["items"])
    assert {item["titulo"] for item in data_a["items"]} == {"A-1", "A-2"}

    res_b = client.get("/incidencias/mias", headers=headers_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["user_id"] == id_b
    assert data_b["items"][0]["titulo"] == "B-1"


def test_mias_sin_token_401(client):
    """(d) GET /incidencias/mias sin token devuelve 401."""
    res = client.get("/incidencias/mias")
    assert res.status_code == 401


def test_mias_paginacion(client, crear_usuario):
    """La paginación de /mias respeta limit/offset y total."""
    _, headers = _headers_de(crear_usuario, "mias.pag@test.com")
    for i in range(3):
        client.post("/incidencias", json=_payload(f"Pag {i}"), headers=headers)

    res = client.get("/incidencias/mias?limit=2&offset=0", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert data["total"] == 3
    assert len(data["items"]) == 2
