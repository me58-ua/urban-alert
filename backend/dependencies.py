from fastapi import Header, HTTPException, status

def get_admin_role(x_role: str = Header(None, alias="X-Role")):
    if not x_role or x_role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida: Se requiere rol de administrador"
        )
    return x_role
