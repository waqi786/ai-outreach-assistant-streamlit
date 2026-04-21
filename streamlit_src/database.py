from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4


class Database:
    def __init__(self, database_path: str) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    encrypted_api_key TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    system_prompt TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
                );
                """
            )

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _row_to_dict(self, row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    def create_user(self, email: str, password_hash: str) -> dict[str, Any]:
        user = {
            "id": str(uuid4()),
            "email": email,
            "password_hash": password_hash,
            "encrypted_api_key": None,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, encrypted_api_key, created_at, updated_at)
                VALUES (:id, :email, :password_hash, :encrypted_api_key, :created_at, :updated_at)
                """,
                user,
            )
        return self.get_user_by_id(user["id"])

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            return self._row_to_dict(row)

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return self._row_to_dict(row)

    def update_user_api_key(self, user_id: str, encrypted_api_key: str | None) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET encrypted_api_key = ?, updated_at = ?
                WHERE id = ?
                """,
                (encrypted_api_key, self._now(), user_id),
            )

    def create_project(self, user_id: str, name: str, system_prompt: str) -> dict[str, Any]:
        project = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "system_prompt": system_prompt,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO projects (id, user_id, name, system_prompt, created_at, updated_at)
                VALUES (:id, :user_id, :name, :system_prompt, :created_at, :updated_at)
                """,
                project,
            )
        return self.get_project(project["id"], user_id)

    def list_projects(self, user_id: str) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM projects
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_project(self, project_id: str, user_id: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM projects
                WHERE id = ? AND user_id = ?
                """,
                (project_id, user_id),
            ).fetchone()
            return self._row_to_dict(row)

    def update_project(self, project_id: str, user_id: str, name: str, system_prompt: str) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE projects
                SET name = ?, system_prompt = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (name, system_prompt, self._now(), project_id, user_id),
            )

    def delete_project(self, project_id: str, user_id: str) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                DELETE FROM projects
                WHERE id = ? AND user_id = ?
                """,
                (project_id, user_id),
            )

    def create_chat(self, project_id: str, title: str) -> dict[str, Any]:
        chat = {
            "id": str(uuid4()),
            "project_id": project_id,
            "title": title,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO chats (id, project_id, title, created_at, updated_at)
                VALUES (:id, :project_id, :title, :created_at, :updated_at)
                """,
                chat,
            )
        return self.get_chat(chat["id"])

    def list_chats(self, project_id: str) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM chats
                WHERE project_id = ?
                ORDER BY updated_at DESC
                """,
                (project_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_chat(self, chat_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        with self.connection() as conn:
            if user_id:
                row = conn.execute(
                    """
                    SELECT chats.*
                    FROM chats
                    JOIN projects ON projects.id = chats.project_id
                    WHERE chats.id = ? AND projects.user_id = ?
                    """,
                    (chat_id, user_id),
                ).fetchone()
            else:
                row = conn.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
            return self._row_to_dict(row)

    def update_chat_title(self, chat_id: str, user_id: str, title: str) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE chats
                SET title = ?, updated_at = ?
                WHERE id = ? AND project_id IN (
                    SELECT id FROM projects WHERE user_id = ?
                )
                """,
                (title[:80], self._now(), chat_id, user_id),
            )

    def touch_chat(self, chat_id: str) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE chats SET updated_at = ? WHERE id = ?",
                (self._now(), chat_id),
            )

    def delete_chat(self, chat_id: str, user_id: str) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                DELETE FROM chats
                WHERE id = ? AND project_id IN (
                    SELECT id FROM projects WHERE user_id = ?
                )
                """,
                (chat_id, user_id),
            )

    def create_message(self, chat_id: str, role: str, content: str) -> dict[str, Any]:
        message = {
            "id": str(uuid4()),
            "chat_id": chat_id,
            "role": role,
            "content": content,
            "created_at": self._now(),
        }
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, chat_id, role, content, created_at)
                VALUES (:id, :chat_id, :role, :content, :created_at)
                """,
                message,
            )
        return message

    def list_messages(self, chat_id: str) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM messages
                WHERE chat_id = ?
                ORDER BY created_at ASC
                """,
                (chat_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def list_recent_messages(self, chat_id: str, limit: int = 10) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT *
                FROM messages
                WHERE chat_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (chat_id, limit),
            ).fetchall()
            return [dict(row) for row in reversed(rows)]
