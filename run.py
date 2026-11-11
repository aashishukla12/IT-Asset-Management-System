"""Run the AssetFlow application with a local SQLite database.

Usage: py run.py
Then open http://127.0.0.1:8000 (opened automatically when possible).
"""

from __future__ import annotations

import json
import sqlite3
import webbrowser
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "assetflow.db"
HOST = "127.0.0.1"
PORT = 8000


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database() -> None:
    """Create the local inventory database and populate it on first launch."""
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tag TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                owner TEXT NOT NULL DEFAULT 'Unassigned',
                status TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


class AssetFlowHandler(SimpleHTTPRequestHandler):
    """Serve the website and a small JSON API from the same local process."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        """Ensure local development changes are visible on every browser refresh."""
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def send_json(self, data: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self.send_json({"status": "ok", "database": DATABASE.name})
            return
        if self.path == "/api/assets":
            with get_connection() as connection:
                rows = connection.execute(
                    "SELECT name, tag, category, owner, status, updated_at FROM assets ORDER BY id DESC"
                ).fetchall()
            self.send_json([dict(row) for row in rows])
            return
        if self.path == "/api/stats":
            with get_connection() as connection:
                total = connection.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
                assigned = connection.execute("SELECT COUNT(*) FROM assets WHERE status = 'Assigned'").fetchone()[0]
                stock = connection.execute("SELECT COUNT(*) FROM assets WHERE status = 'In stock'").fetchone()[0]
                repair = connection.execute("SELECT COUNT(*) FROM assets WHERE status = 'In repair'").fetchone()[0]
                categories = dict(connection.execute("SELECT category, COUNT(*) FROM assets GROUP BY category").fetchall())
            self.send_json({
                "total": total,
                "assigned": assigned,
                "stock": stock,
                "repair": repair,
                "unassigned": stock,
                "categories": categories,
            })
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path != "/api/assets":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            name = str(data["name"]).strip()
            tag = str(data["tag"]).strip().upper()
            category = str(data["category"]).strip()
            owner = str(data.get("owner") or "Unassigned").strip()
            if not all((name, tag, category)):
                raise ValueError("Name, tag, and category are required.")
            status = "In stock" if owner == "Unassigned" else "Assigned"
            updated_at = datetime.now().isoformat(timespec="seconds")
            with get_connection() as connection:
                connection.execute(
                    "INSERT INTO assets (name, tag, category, owner, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (name, tag, category, owner, status, updated_at),
                )
            self.send_json({"ok": True}, HTTPStatus.CREATED)
        except (KeyError, ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except sqlite3.IntegrityError:
            self.send_json({"error": "That asset tag already exists."}, HTTPStatus.CONFLICT)


def main() -> None:
    initialise_database()
    url = f"http://{HOST}:{PORT}"
    server = ThreadingHTTPServer((HOST, PORT), AssetFlowHandler)
    print(f"AssetFlow is running at {url}")
    print(f"Database ready: {DATABASE}")
    print("Press Ctrl+C to stop the application.")
    Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAssetFlow stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
