"""Monta index.html (un único archivo) a partir de src/ y data/."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = ROOT / "src"

HEAD = (
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "<title>DMP Pádel · Resultados y clasificaciones</title>\n"
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,700;1,800;1,900'
    '&family=Barlow:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
)


def main():
    club = json.loads((DATA / "club.json").read_text(encoding="utf-8"))
    datos = dict(
        club=club["club"],
        sede=club["sede"],
        temporada=club["temporada"],
        actualizado=club.get("actualizado", ""),
        instagram=club.get("instagram", ""),
        demo=False,
        noticias=json.loads((DATA / "noticias.json").read_text(encoding="utf-8")),
        equipos=json.loads((DATA / "equipos.json").read_text(encoding="utf-8")),
    )
    css = (SRC / "app.css").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    logo = (SRC / "logo.b64").read_text(encoding="utf-8").strip()
    j = json.dumps(datos, ensure_ascii=False, indent=1).replace("<", "\\u003c")
    E = "</script>"
    html = (
        '<!DOCTYPE html>\n<html lang="es">\n<head>\n' + HEAD
        + '<style id="app-css">' + css + "</style>\n</head>\n<body>\n<div id=\"root\"></div>\n"
        + '<script id="logo-data" type="text/plain">' + logo + E + "\n"
        + '<script id="data" type="application/json">' + j + E + "\n"
        + '<script id="app-js">' + js + E + "\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"✔ index.html generado ({len(html)//1024} KB)")


if __name__ == "__main__":
    main()
