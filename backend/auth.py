import hashlib
import hmac
import os
import json
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

DB_PATH = Path(os.getenv("AITINERARY_DB_PATH", str(Path(__file__).resolve().parent / "aitinerary.db")))
TOKEN_TTL_DAYS = 30


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                email_verified INTEGER NOT NULL DEFAULT 0,
                verification_token TEXT,
                reset_token TEXT,
                reset_expires_at TEXT
            );

            DROP TABLE IF EXISTS sessions;

            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS saved_trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                itinerary_json TEXT NOT NULL,
                saved_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )

    for statement in (
        "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN verification_token TEXT",
        "ALTER TABLE users ADD COLUMN reset_token TEXT",
        "ALTER TABLE users ADD COLUMN reset_expires_at TEXT",
    ):
        try:
            with _connect() as connection:
                connection.execute(statement)
        except sqlite3.OperationalError:
            pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


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
    return hmac.compare_digest(candidate, digest)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    email = email.strip().lower()
    verification_token = secrets.token_urlsafe(32)
    with _connect() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            raise ValueError("An account with this email already exists.")

        cursor = connection.execute(
            "INSERT INTO users (name, email, password_hash, created_at, verification_token) VALUES (?, ?, ?, ?, ?)",
            (name.strip(), email, hash_password(password), _now().isoformat(), hash_token(verification_token)),
        )
        user_id = cursor.lastrowid
    return {
        "id": user_id,
        "name": name.strip(),
        "email": email,
        "email_verified": False,
        "verification_token": verification_token,
    }


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    created = _now()
    expires = created + timedelta(days=TOKEN_TTL_DAYS)
    with _connect() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (hash_token(token), user_id, created.isoformat(), expires.isoformat()),
        )
    return token


def get_user_for_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    token_hash = hash_token(token)
    with _connect() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.email_verified, sessions.expires_at
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
            """,
            (token_hash,),
        ).fetchone()
    if not row:
        return None
    expires = datetime.fromisoformat(row["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < _now():
        revoke_session(token)
        return None
    new_expiry = _now() + timedelta(days=TOKEN_TTL_DAYS)
    with _connect() as connection:
        connection.execute(
            "UPDATE sessions SET expires_at = ? WHERE token_hash = ?",
            (new_expiry.isoformat(), token_hash),
        )
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "email_verified": bool(row["email_verified"]),
    }




def revoke_session(token: str) -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))


def list_saved_trips(user_id: int) -> list:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, itinerary_json, saved_at FROM saved_trips WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    result = []
    for row in rows:
        try:
            itinerary = json.loads(row["itinerary_json"])
        except json.JSONDecodeError:
            continue
        result.append({"id": row["id"], "savedAt": row["saved_at"], "itinerary": itinerary})
    return result


def save_trip(user_id: int, itinerary: Dict[str, Any]) -> Dict[str, Any]:
    saved_at = _now().isoformat()
    with _connect() as connection:
        cursor = connection.execute(
            "INSERT INTO saved_trips (user_id, itinerary_json, saved_at) VALUES (?, ?, ?)",
            (user_id, json.dumps(itinerary), saved_at),
        )
        trip_id = cursor.lastrowid
    return {"id": trip_id, "savedAt": saved_at}


def delete_saved_trip(user_id: int, trip_id: int) -> bool:
    with _connect() as connection:
        cursor = connection.execute(
            "DELETE FROM saved_trips WHERE id = ? AND user_id = ?", (trip_id, user_id)
        )
        return cursor.rowcount > 0



def verify_email_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hash_token(token)
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, name, email FROM users WHERE verification_token = ?",
            (token_hash,),
        ).fetchone()
        if not row:
            return None
        connection.execute(
            "UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?",
            (row["id"],),
        )
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def create_password_reset(email: str) -> Optional[str]:
    email = email.strip().lower()
    with _connect() as connection:
        row = connection.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
        if not row:
            return None
        reset_token = secrets.token_urlsafe(32)
        expires = _now() + timedelta(hours=1)
        connection.execute(
            "UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?",
            (hash_token(reset_token), expires.isoformat(), row["id"]),
        )
    return reset_token


def reset_password(token: str, new_password: str) -> bool:
    token_hash = hash_token(token)
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, reset_expires_at FROM users WHERE reset_token = ?",
            (token_hash,),
        ).fetchone()
        if not row:
            return False
        expires = datetime.fromisoformat(row["reset_expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < _now():
            return False
        connection.execute(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?",
            (hash_password(new_password), row["id"]),
        )
        connection.execute("DELETE FROM sessions WHERE user_id = ?", (row["id"],))
    return True


def refresh_session(old_token: str) -> Optional[str]:
    user = get_user_for_token(old_token)
    if not user:
        return None
    revoke_session(old_token)
    return create_session(user["id"])


init_db()
