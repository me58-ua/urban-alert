"""Tests de asignación de equipos a incidencias con validación de categoría
(issue #36, solo admin).

Reglas cubiertas:
- Asignar un equipo COMPATIBLE (misma categoría) -> 200, la respuesta trae
  `equipo_id` y el resumen `equipo: {id, nombre, categoria}`.
- Asignar un equipo de categoría DISTINTA -> 409.
- Desasignar (`equipo_id: null`) -> 200, `equipo_id` y `equipo` quedan null.
- Equipo inexistente -> 404.
- Incidencia inexistente -> 404.
- Un NO-admin (ciudadano) -> 403.
"""


def _crear_equipo(client, admin_headers, nombre, categoria):
    resp = client.post(
        "/equipos",
        json={"nombre": nombre, "categoria": categoria},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_incidencia(client, categoria):
    resp = client.post(
        "/incidencias",
        json={
            "titulo": "Incidencia de prueba",
            "descripcion": "Descripción de prueba",
            "categoria": categoria,
            "latitud": 38.477,
            "longitud": -0.791,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_asignar_equipo_compatible(client, admin_headers):
    """Un admin asigna un equipo de la MISMA categoría -> 200 con equipo expuesto."""
    equipo = _crear_equipo(client, admin_headers, "Brigada alumbrado", "alumbrado")
    incidencia = _crear_incidencia(client, "alumbrado")

    resp = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": equipo["id"]},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["equipo_id"] == equipo["id"]
    assert data["equipo"] is not None
    assert data["equipo"]["id"] == equipo["id"]
    assert data["equipo"]["nombre"] == "Brigada alumbrado"
    assert data["equipo"]["categoria"] == "alumbrado"


def test_asignar_equipo_categoria_distinta_rechazado(client, admin_headers):
    """Un equipo de categoría DISTINTA a la incidencia se rechaza con 409."""
    equipo = _crear_equipo(client, admin_headers, "Brigada residuos", "residuos")
    incidencia = _crear_incidencia(client, "trafico")

    resp = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": equipo["id"]},
        headers=admin_headers,
    )
    assert resp.status_code == 409, resp.text

    # La incidencia NO ha quedado asignada tras el rechazo.
    detalle = client.get(f"/incidencias/{incidencia['id']}").json()
    assert detalle["equipo_id"] is None
    assert detalle["equipo"] is None


def test_desasignar_equipo(client, admin_headers):
    """Desasignar (equipo_id: null) deja la incidencia sin equipo -> 200."""
    equipo = _crear_equipo(client, admin_headers, "Brigada trafico", "trafico")
    incidencia = _crear_incidencia(client, "trafico")

    # Primero asignar.
    asignar = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": equipo["id"]},
        headers=admin_headers,
    )
    assert asignar.status_code == 200, asignar.text
    assert asignar.json()["equipo_id"] == equipo["id"]

    # Luego desasignar.
    resp = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": None},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["equipo_id"] is None
    assert data["equipo"] is None


def test_asignar_equipo_inexistente_404(client, admin_headers):
    """Asignar un equipo que no existe -> 404."""
    incidencia = _crear_incidencia(client, "infraestructura")

    resp = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": 999999},
        headers=admin_headers,
    )
    assert resp.status_code == 404, resp.text


def test_asignar_a_incidencia_inexistente_404(client, admin_headers):
    """Asignar a una incidencia que no existe -> 404."""
    equipo = _crear_equipo(client, admin_headers, "Brigada zonas", "zonas_verdes")

    resp = client.patch(
        "/incidencias/999999/equipo",
        json={"equipo_id": equipo["id"]},
        headers=admin_headers,
    )
    assert resp.status_code == 404, resp.text


def test_asignar_equipo_no_admin_403(client, admin_headers, ciudadano_headers):
    """Un ciudadano (rol insuficiente) no puede asignar equipos -> 403."""
    equipo = _crear_equipo(client, admin_headers, "Brigada otro", "otro")
    incidencia = _crear_incidencia(client, "otro")

    resp = client.patch(
        f"/incidencias/{incidencia['id']}/equipo",
        json={"equipo_id": equipo["id"]},
        headers=ciudadano_headers,
    )
    assert resp.status_code == 403, resp.text
