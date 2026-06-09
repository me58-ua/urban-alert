import pytest


def test_local_storage_guarda_archivo(tmp_path):
    from storage import LocalStorage

    st = LocalStorage(str(tmp_path / "imgs"))
    ruta = st.guardar(b"\xff\xd8\xff datos", "jpg")

    assert ruta.startswith("/uploads/")
    assert ruta.endswith(".jpg")
    # El archivo existe físicamente en el directorio configurado (persistente).
    nombre = ruta.rsplit("/", 1)[-1]
    archivos = [f.name for f in (tmp_path / "imgs").iterdir()]
    assert nombre in archivos


def test_get_storage_local_por_defecto():
    from storage import get_storage, LocalStorage

    assert isinstance(get_storage(), LocalStorage)


def test_get_storage_s3_sin_bucket_error(monkeypatch):
    import config
    from storage import get_storage, StorageError

    monkeypatch.setattr(config.settings, "storage_backend", "s3")
    monkeypatch.setattr(config.settings, "s3_bucket", None)

    with pytest.raises(StorageError):
        get_storage()


def test_subir_y_recuperar_imagen_por_url(client):
    inc_id = client.post("/incidencias", json={
        "titulo": "Img recuperable", "categoria": "otro", "latitud": 8.0, "longitud": 8.0
    }).json()["id"]

    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    up = client.post(f"/incidencias/{inc_id}/imagenes", files={"file": ("x.png", png, "image/png")})
    assert up.status_code == 201
    ruta = up.json()["ruta"]
    assert ruta.startswith("/uploads/")

    # La imagen es recuperable por su URL (servida por StaticFiles desde el directorio).
    got = client.get(ruta)
    assert got.status_code == 200
    assert got.content == png
