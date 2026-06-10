"""Tests del CRUD de equipos y trabajadores (issue #35, solo admin)."""


def _crear_equipo(client, admin_headers, nombre="Brigada A", categoria="infraestructura"):
    res = client.post(
        "/equipos",
        json={"nombre": nombre, "categoria": categoria},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


# ── Equipos: CRUD ────────────────────────────────────────────────────────────
def test_crear_equipo_y_listar(client, admin_headers):
    """POST /equipos crea (201, categoria válida) y aparece en GET /equipos."""
    data = _crear_equipo(client, admin_headers, nombre="Equipo Luz", categoria="alumbrado")
    assert data["nombre"] == "Equipo Luz"
    assert data["categoria"] == "alumbrado"
    assert data["trabajadores"] == []
    assert isinstance(data["id"], int)

    res = client.get("/equipos", headers=admin_headers)
    assert res.status_code == 200
    ids = [e["id"] for e in res.json()]
    assert data["id"] in ids


def test_crear_equipo_categoria_invalida_422(client, admin_headers):
    """POST /equipos con categoria fuera del enum -> 422."""
    res = client.post(
        "/equipos",
        json={"nombre": "X", "categoria": "no_existe"},
        headers=admin_headers,
    )
    assert res.status_code == 422


def test_get_equipo(client, admin_headers):
    """GET /equipos/{id} devuelve el equipo."""
    equipo = _crear_equipo(client, admin_headers)
    res = client.get(f"/equipos/{equipo['id']}", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["id"] == equipo["id"]


def test_get_equipo_404(client, admin_headers):
    """GET /equipos/{id} inexistente -> 404."""
    res = client.get("/equipos/999999", headers=admin_headers)
    assert res.status_code == 404


def test_patch_equipo(client, admin_headers):
    """PATCH /equipos/{id} actualiza nombre y categoria."""
    equipo = _crear_equipo(client, admin_headers, categoria="otro")
    res = client.patch(
        f"/equipos/{equipo['id']}",
        json={"nombre": "Renombrado", "categoria": "trafico"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["nombre"] == "Renombrado"
    assert data["categoria"] == "trafico"


def test_patch_equipo_parcial_solo_no_none(client, admin_headers):
    """PATCH /equipos/{id} solo aplica campos no-None (deja el resto igual)."""
    equipo = _crear_equipo(client, admin_headers, nombre="Original", categoria="residuos")
    res = client.patch(
        f"/equipos/{equipo['id']}",
        json={"nombre": "SoloNombre"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["nombre"] == "SoloNombre"
    assert data["categoria"] == "residuos"


def test_patch_equipo_404(client, admin_headers):
    res = client.patch("/equipos/999999", json={"nombre": "X"}, headers=admin_headers)
    assert res.status_code == 404


def test_delete_equipo(client, admin_headers):
    """DELETE /equipos/{id} -> 204 y luego 404."""
    equipo = _crear_equipo(client, admin_headers)
    res = client.delete(f"/equipos/{equipo['id']}", headers=admin_headers)
    assert res.status_code == 204
    assert client.get(f"/equipos/{equipo['id']}", headers=admin_headers).status_code == 404


def test_delete_equipo_404(client, admin_headers):
    res = client.delete("/equipos/999999", headers=admin_headers)
    assert res.status_code == 404


# ── Trabajadores en equipo ───────────────────────────────────────────────────
def test_crear_trabajador_en_equipo_y_aparece_en_response(client, admin_headers):
    """POST /equipos/{id}/trabajadores crea+asigna; aparece en EquipoResponse."""
    equipo = _crear_equipo(client, admin_headers)
    res = client.post(
        f"/equipos/{equipo['id']}/trabajadores",
        json={"nombre": "Ana", "puesto": "Técnica", "disponible": True},
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    trab = res.json()
    assert trab["nombre"] == "Ana"
    assert trab["puesto"] == "Técnica"
    assert trab["disponible"] is True
    assert trab["equipo_id"] == equipo["id"]

    # Aparece anidado en el equipo.
    detalle = client.get(f"/equipos/{equipo['id']}", headers=admin_headers).json()
    ids = [t["id"] for t in detalle["trabajadores"]]
    assert trab["id"] in ids


def test_crear_trabajador_en_equipo_inexistente_404(client, admin_headers):
    res = client.post(
        "/equipos/999999/trabajadores",
        json={"nombre": "Ana"},
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_quitar_trabajador_deja_equipo_id_null_pero_no_lo_borra(client, admin_headers):
    """DELETE /equipos/{id}/trabajadores/{tid} desasigna (equipo_id null) sin borrar."""
    equipo = _crear_equipo(client, admin_headers)
    trab = client.post(
        f"/equipos/{equipo['id']}/trabajadores",
        json={"nombre": "Bea"},
        headers=admin_headers,
    ).json()

    res = client.delete(
        f"/equipos/{equipo['id']}/trabajadores/{trab['id']}",
        headers=admin_headers,
    )
    assert res.status_code == 204

    # Ya no está en el equipo.
    detalle = client.get(f"/equipos/{equipo['id']}", headers=admin_headers).json()
    assert trab["id"] not in [t["id"] for t in detalle["trabajadores"]]

    # Pero el trabajador SIGUE existiendo, con equipo_id null.
    listado = client.get("/trabajadores", headers=admin_headers).json()
    encontrado = next((t for t in listado if t["id"] == trab["id"]), None)
    assert encontrado is not None
    assert encontrado["equipo_id"] is None


def test_quitar_trabajador_de_otro_equipo_404(client, admin_headers):
    """Quitar un trabajador que no pertenece a ese equipo -> 404."""
    equipo_a = _crear_equipo(client, admin_headers, nombre="A")
    equipo_b = _crear_equipo(client, admin_headers, nombre="B")
    trab = client.post(
        f"/equipos/{equipo_a['id']}/trabajadores",
        json={"nombre": "Caro"},
        headers=admin_headers,
    ).json()
    res = client.delete(
        f"/equipos/{equipo_b['id']}/trabajadores/{trab['id']}",
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_borrar_equipo_deja_trabajadores_con_equipo_id_null(client, admin_headers):
    """Al borrar un equipo, sus trabajadores quedan con equipo_id null (no se borran)."""
    equipo = _crear_equipo(client, admin_headers)
    trab = client.post(
        f"/equipos/{equipo['id']}/trabajadores",
        json={"nombre": "Dani"},
        headers=admin_headers,
    ).json()

    assert client.delete(f"/equipos/{equipo['id']}", headers=admin_headers).status_code == 204

    listado = client.get("/trabajadores", headers=admin_headers).json()
    encontrado = next((t for t in listado if t["id"] == trab["id"]), None)
    assert encontrado is not None, "el trabajador NO debe borrarse al borrar el equipo"
    assert encontrado["equipo_id"] is None


# ── Trabajadores: CRUD independiente ─────────────────────────────────────────
def test_patch_trabajador(client, admin_headers):
    equipo = _crear_equipo(client, admin_headers)
    trab = client.post(
        f"/equipos/{equipo['id']}/trabajadores",
        json={"nombre": "Eva", "disponible": True},
        headers=admin_headers,
    ).json()
    res = client.patch(
        f"/trabajadores/{trab['id']}",
        json={"puesto": "Jefa", "disponible": False},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["puesto"] == "Jefa"
    assert data["disponible"] is False
    assert data["nombre"] == "Eva"


def test_patch_trabajador_404(client, admin_headers):
    res = client.patch("/trabajadores/999999", json={"nombre": "X"}, headers=admin_headers)
    assert res.status_code == 404


def test_delete_trabajador(client, admin_headers):
    equipo = _crear_equipo(client, admin_headers)
    trab = client.post(
        f"/equipos/{equipo['id']}/trabajadores",
        json={"nombre": "Fran"},
        headers=admin_headers,
    ).json()
    res = client.delete(f"/trabajadores/{trab['id']}", headers=admin_headers)
    assert res.status_code == 204

    listado = client.get("/trabajadores", headers=admin_headers).json()
    assert trab["id"] not in [t["id"] for t in listado]


def test_delete_trabajador_404(client, admin_headers):
    res = client.delete("/trabajadores/999999", headers=admin_headers)
    assert res.status_code == 404


# ── Autorización: solo admin ─────────────────────────────────────────────────
def test_ciudadano_no_puede_listar_equipos_403(client, ciudadano_headers):
    assert client.get("/equipos", headers=ciudadano_headers).status_code == 403


def test_ciudadano_no_puede_crear_equipo_403(client, ciudadano_headers):
    res = client.post(
        "/equipos",
        json={"nombre": "X", "categoria": "otro"},
        headers=ciudadano_headers,
    )
    assert res.status_code == 403


def test_ciudadano_no_puede_operar_trabajadores_403(client, ciudadano_headers):
    assert client.get("/trabajadores", headers=ciudadano_headers).status_code == 403
    assert client.post(
        "/equipos/1/trabajadores",
        json={"nombre": "X"},
        headers=ciudadano_headers,
    ).status_code == 403
    assert client.delete("/equipos/1/trabajadores/1", headers=ciudadano_headers).status_code == 403
    assert client.patch("/trabajadores/1", json={"nombre": "X"}, headers=ciudadano_headers).status_code == 403
    assert client.delete("/trabajadores/1", headers=ciudadano_headers).status_code == 403


def test_sin_token_401(client):
    """Sin token -> 401 en endpoints protegidos."""
    assert client.get("/equipos").status_code == 401
    assert client.post("/equipos", json={"nombre": "X", "categoria": "otro"}).status_code == 401
