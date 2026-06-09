def test_settings_defaults():
    from config import Settings

    s = Settings(_env_file=None)  # ignora un posible .env local
    assert s.database_url.startswith("postgresql")
    assert s.jwt_algorithm == "HS256"
    assert s.access_token_expire_minutes == 60
    assert s.max_imagen_bytes == 5 * 1024 * 1024
    assert s.allowed_origins is None


def test_settings_env_override(monkeypatch):
    from config import Settings

    monkeypatch.setenv("SECRET_KEY", "clave-de-test")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "5")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://a.com,http://b.com")

    s = Settings(_env_file=None)
    assert s.secret_key == "clave-de-test"
    assert s.access_token_expire_minutes == 5
    assert s.allowed_origins == "http://a.com,http://b.com"
