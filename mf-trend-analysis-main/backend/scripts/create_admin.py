"""
One-off script to create the first admin user.

Usage:
    python scripts/create_admin.py admin@example.com "Admin User" StrongPassword123
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


def create_admin(email: str, full_name: str, password: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.role = UserRole.ADMIN
            existing.is_active = True
            db.add(existing)
            db.commit()
            print(f"Existing user {email} promoted to admin.")
            return

        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"Admin user {email} created.")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print('Usage: python scripts/create_admin.py <email> "<full name>" <password>')
        sys.exit(1)

    create_admin(sys.argv[1], sys.argv[2], sys.argv[3])
