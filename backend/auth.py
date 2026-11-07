import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from backend.database import SessionLocal, User, Session, SavedTrip, Notification, init_db

TOKEN_TTL_DAYS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return f"{salt}:{digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split(":", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    import hmac

    return hmac.compare_digest(candidate, digest)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    email = email.strip().lower()
    verification_token = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            raise ValueError("An account with this email already exists.")

        user = User(
            name=name.strip(),
            email=email,
            password_hash=hash_password(password),
            created_at=_now(),
            verification_token=hash_token(verification_token),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "email_verified": bool(user.email_verified),
            "verification_token": verification_token,
        }


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if not user or not verify_password(password, user.password_hash):
            return None
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "email_verified": bool(user.email_verified),
        }


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    created = _now()
    expires = created + timedelta(days=TOKEN_TTL_DAYS)
    with SessionLocal() as db:
        session = Session(
            token_hash=hash_token(token),
            user_id=user_id,
            created_at=created,
            expires_at=expires,
        )
        db.add(session)
        db.commit()
    return token


def get_user_for_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    token_hash = hash_token(token)
    with SessionLocal() as db:
        session = db.scalar(select(Session).where(Session.token_hash == token_hash))
        if not session:
            return None
        expires = _naive(session.expires_at)
        if expires < _now():
            db.delete(session)
            db.commit()
            return None
        user = db.scalar(select(User).where(User.id == session.user_id))
        if not user:
            db.delete(session)
            db.commit()
            return None
        session.expires_at = _now() + timedelta(days=TOKEN_TTL_DAYS)
        db.commit()
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "email_verified": bool(user.email_verified),
        }


def revoke_session(token: str) -> None:
    token_hash = hash_token(token)
    with SessionLocal() as db:
        session = db.scalar(select(Session).where(Session.token_hash == token_hash))
        if session:
            db.delete(session)
            db.commit()


def verify_email_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hash_token(token)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.verification_token == token_hash))
        if not user:
            return None
        user.email_verified = True
        user.verification_token = None
        db.commit()
        return {"id": user.id, "name": user.name, "email": user.email}


def create_password_reset(email: str) -> Optional[str]:
    email = email.strip().lower()
    reset_token = secrets.token_urlsafe(32)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            return None
        user.reset_token = hash_token(reset_token)
        user.reset_expires_at = _now() + timedelta(hours=1)
        db.commit()
    return reset_token


def reset_password(token: str, new_password: str) -> bool:
    token_hash = hash_token(token)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.reset_token == token_hash))
        if not user:
            return False
        expires = _naive(user.reset_expires_at)
        if expires is None or expires < _now():
            return False
        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_expires_at = None
        # Revoke all sessions for this user.
        db.query(Session).filter(Session.user_id == user.id).delete()
        db.commit()
    return True


def refresh_session(old_token: str) -> Optional[str]:
    user = get_user_for_token(old_token)
    if not user:
        return None
    revoke_session(old_token)
    return create_session(user["id"])


def list_saved_trips(user_id: int) -> list:
    with SessionLocal() as db:
        rows = db.scalars(
            select(SavedTrip).where(SavedTrip.user_id == user_id).order_by(SavedTrip.id.desc())
        ).all()
        result = []
        for row in rows:
            try:
                itinerary = json.loads(row.itinerary_json)
            except json.JSONDecodeError:
                continue
            result.append({"id": row.id, "savedAt": row.saved_at.isoformat(), "itinerary": itinerary})
        return result


def save_trip(user_id: int, itinerary: Dict[str, Any]) -> Dict[str, Any]:
    saved_at = _now()
    with SessionLocal() as db:
        trip = SavedTrip(user_id=user_id, itinerary_json=json.dumps(itinerary), saved_at=saved_at)
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return {"id": trip.id, "savedAt": trip.saved_at.isoformat()}


def delete_saved_trip(user_id: int, trip_id: int) -> bool:
    with SessionLocal() as db:
        trip = db.scalar(select(SavedTrip).where(SavedTrip.id == trip_id, SavedTrip.user_id == user_id))
        if not trip:
            return False
        db.delete(trip)
        db.commit()
        return True


def create_notification(user_id: int, kind: str, title: str, body: str) -> None:
    with SessionLocal() as db:
        db.add(Notification(user_id=user_id, kind=kind, title=title, body=body))
        db.commit()


def list_notifications(user_id: int) -> List[Dict[str, Any]]:
    with SessionLocal() as db:
        rows = db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(50)
        ).all()
        return [
            {
                "id": row.id,
                "kind": row.kind,
                "title": row.title,
                "body": row.body,
                "read": bool(row.read),
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]


def unread_notification_count(user_id: int) -> int:
    with SessionLocal() as db:
        rows = db.scalars(
            select(Notification.read).where(
                Notification.user_id == user_id, Notification.read.is_(False)
            )
        ).all()
        return len(rows)


def mark_notifications_read(user_id: int) -> int:
    with SessionLocal() as db:
        rows = db.scalars(
            select(Notification).where(
                Notification.user_id == user_id, Notification.read.is_(False)
            )
        ).all()
        for row in rows:
            row.read = True
        db.commit()
        return len(rows)


init_db()