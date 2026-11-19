"""Monta index.html (un único archivo) y sitemap.xml a partir de src/ y data/."""
import json
from datetime import datetime
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = ROOT / "src"

SITE = "https://dmp-padel.github.io/"
TITLE = "DMP Pádel · Club de pádel del PIC (Bizkaia) · Resultados y clasificaciones"
DESC = (
    "DMP Pádel, club de pádel del Padel Indoor Center (PIC) en Bizkaia. Resultados, clasificaciones, "
    "calendario, copa y estadísticas de jugadores de nuestros equipos de 5ª, 6ª y 6ª femenina en la Liga Bizkaina."
)

HEAD = (
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    f"<title>{TITLE}</title>\n"
    f'<meta name="description" content="{DESC}">\n'
    f'<link rel="canonical" href="{SITE}">\n'
    '<meta name="robots" content="index,follow">\n'
    '<meta name="theme-color" content="#03050a">\n'
    '<link rel="icon" type="image/png" href="favicon.png">\n'
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:site_name" content="DMP Pádel">\n'
    '<meta property="og:locale" content="es_ES">\n'
    '<meta property="og:title" content="DMP Pádel · Club de pádel del PIC (Bizkaia)">\n'
    f'<meta property="og:description" content="{DESC}">\n'
    f'<meta property="og:url" content="{SITE}">\n'
    f'<meta property="og:image" content="{SITE}og-image.jpg">\n'
    '<meta property="og:image:width" content="1200">\n'
    '<meta property="og:image:height" content="630">\n'
    '<meta name="twitter:card" content="summary_large_image">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,700;1,800;1,900'
    '&family=Barlow:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
)


def datos_estructurados(datos):
    """Ficha del club para Google (schema.org)."""
    ld = {
        "@context": "https://schema.org",
        "@type": "SportsOrganization",
        "name": "DMP Pádel",
        "alternateName": ["DMP Padel", "Club DMP", "DMP"],
        "sport": "Pádel",
        "url": SITE,
        "logo": SITE + "icon-512.png",
        "image": SITE + "og-image.jpg",
        "description": DESC,
        "location": {
            "@type": "Place",
            "name": "BamVolea PIC (Padel Indoor Center)",
            "address": {"@type": "PostalAddress", "addressRegion": "Bizkaia", "addressCountry": "ES"},
        },
        "memberOf": {"@type": "SportsOrganization", "name": "Federación Bizkaina de Pádel",
                     "url": "https://www.bizkaiapadel.com/"},
    }
    if datos.get("instagram"):
        ld["sameAs"] = ["https://www.instagram.com/" + datos["instagram"].lstrip("@") + "/"]
    return json.dumps(ld, ensure_ascii=False).replace("<", "\\u003c")


def texto_estatico(datos):
    """Texto que Google lee directamente; la app lo sustituye al cargar."""
    equipos = "".join(
        f"<li>{escape(e['nombre'])} – {escape(e['categoria'])} ({escape(e['liga'])})</li>" for e in datos["equipos"]
    )
    return (
        f"<h1>DMP Pádel</h1><p>{escape(DESC)}</p>"
        f"<h2>Nuestros equipos</h2><ul>{equipos}</ul>"
        f"<p>Datos de la Federación Bizkaina de Pádel, actualizados el {escape(datos.get('actualizado', ''))}.</p>"
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
        + '<script type="application/ld+json">' + datos_estructurados(datos) + E + "\n"
        + '<style id="app-css">' + css + "</style>\n</head>\n<body>\n"
        + '<div id="root">' + texto_estatico(datos) + "</div>\n"
        + '<script id="logo-data" type="text/plain">' + logo + E + "\n"
        + '<script id="data" type="application/json">' + j + E + "\n"
        + '<script id="app-js">' + js + E + "\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(html, encoding="utf-8")

    hoy = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d")
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{SITE}</loc><lastmod>{hoy}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n"
        "</urlset>\n",
        encoding="utf-8",
    )
    print(f"✔ index.html generado ({len(html)//1024} KB) y sitemap.xml")


if __name__ == "__main__":
    main()
