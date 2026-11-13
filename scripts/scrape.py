"""Descarga de la web de la Federación Bizkaina de Pádel la clasificación,
el calendario y los resultados (pareja a pareja) de los equipos del DMP
definidos en data/config.json, y los guarda en data/equipos.json.

Si algo falla (web caída, cambio de formato...), NO toca los datos
existentes y termina con error, para que GitHub te avise por correo.
"""
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BASE = "https://www.bizkaiapadel.com"
HEADERS = {"User-Agent": "DMP-Padel-web/1.0 (actualizacion semanal de resultados del club)"}
PAUSA = 1.0  # segundos entre peticiones, para no cargar la web de la Federación

session = requests.Session()
session.headers.update(HEADERS)


def txt(el):
    return re.sub(r"\s+", " ", el.get_text(" ") if el else "").strip()


def nombre_bonito(s):
    s = re.sub(r"\s+", " ", s).lower().strip()
    return re.sub(r"(^|[\s\-])(\w)", lambda m: m.group(1) + m.group(2).upper(), s)


def url_jornada(c, j):
    return f"{BASE}/Home/JornadaLiga/{c['comp']}?fase={c['fase']}&grupoId={c['grupo']}&jornada={j}"


def descargar(url):
    r = session.get(url, timeout=30)
    r.raise_for_status()
    time.sleep(PAUSA)
    return BeautifulSoup(r.text, "html.parser")


def leer_tabla(soup):
    filas = []
    for tr in soup.select("main table tr"):
        celdas = [txt(td) for td in tr.find_all(["td", "th"])]
        if len(celdas) >= 8 and celdas[0].isdigit():
            filas.append(celdas)
    return filas


def leer_encuentros(soup):
    out = []
    for ei in soup.select(".encuentro-info"):
        card = ei.find_parent(class_="listing-content")
        if card is None:
            continue
        lb = card.select_one(".listing-button")
        m = {
            "loc": txt(ei.select_one(".equipo-local")),
            "vis": txt(ei.select_one(".equipo-visitante")),
            "gl": txt(ei.select_one("[class*=resultado-local-mobile]")),
            "gv": txt(ei.select_one("[class*=resultado-visitante-mobile]")),
            "fh": txt(lb.select_one("h6")) if lb else "",
            "lugar": txt(lb.select_one("p")) if lb else "",
            "p": [],
        }
        for pr in card.select(".partido-row"):
            m["p"].append({
                "l": txt(pr.select_one(".partido-local-nombre")),
                "v": txt(pr.select_one(".partido-visitante-nombre")),
                "sl": [txt(x) for x in pr.select(".partido-resultado-local")],
                "sv": [txt(x) for x in pr.select(".partido-resultado-visitante")],
            })
        out.append(m)
    return out


def sumar_jugadores(jugadores, mia, gano, sg, sp, pref=""):
    """Suma a cada jugador de la pareja un partido. pref="" liga, "c" copa."""
    for n in mia.split(" - "):
        n = nombre_bonito(n)
        if not n:
            continue
        s = jugadores.setdefault(n.upper(), {"nombre": n, "pj": 0, "pg": 0, "sg": 0, "sp": 0, "cpj": 0, "cpg": 0, "csg": 0, "csp": 0})
        s[pref + "pj"] += 1
        s[pref + "pg"] += gano
        s[pref + "sg"] += sg
        s[pref + "sp"] += sp


def es_nuestro(nombre, c):
    return nombre.strip().lower() == c["equipo"].strip().lower()


def procesar(c, tabla, jornadas, copa_raw=None):
    nuestro = next((f[1] for f in tabla if es_nuestro(f[1], c)), None)
    if nuestro is None:
        raise RuntimeError(f"No encuentro a «{c['equipo']}» en la clasificación de {c['id']}")
    jugadores, partidos = {}, []
    for j, encuentros in jornadas:
        for m in encuentros:
            if not (es_nuestro(m["loc"], c) or es_nuestro(m["vis"], c)):
                continue
            local = es_nuestro(m["loc"], c)
            fh = m["fh"].split()
            d, mo, y = (fh[0].split("/") + ["", "", ""])[:3] if fh else ("", "", "")
            hora = fh[1] if len(fh) > 1 and fh[1] != "00:00" else ""
            jugado = any(
                (a not in ("", "0") or b not in ("", "0"))
                for p in m["p"] for a, b in zip(p["sl"], p["sv"])
            )
            parejas = []
            if jugado:
                for p in m["p"]:
                    mia, suya = (p["l"], p["v"]) if local else (p["v"], p["l"])
                    a, b = (p["sl"], p["sv"]) if local else (p["sv"], p["sl"])
                    sg = sp = 0
                    sets = []
                    for x, z in zip(a, b):
                        if x in ("", "0") and z in ("", "0"):
                            continue
                        sets.append(f"{x}-{z}")
                        if int(x or 0) > int(z or 0):
                            sg += 1
                        else:
                            sp += 1
                    gano = 1 if sg > sp else 0
                    sumar_jugadores(jugadores, mia, gano, sg, sp)
                    parejas.append({"dmp": nombre_bonito(mia), "riv": nombre_bonito(suya), "sets": " ".join(sets), "g": gano})
            gl, gv = int(m["gl"] or 0), int(m["gv"] or 0)
            partidos.append({
                "j": j,
                "fecha": f"{y}-{mo}-{d}" if y else "",
                "hora": hora,
                "rival": m["vis"] if local else m["loc"],
                "lugar": "Local" if local else "Visitante",
                "sede": m["lugar"],
                "dmp": (gl if local else gv) if jugado else "",
                "riv": (gv if local else gl) if jugado else "",
                "parejas": parejas,
            })
    copa = procesar_copa(c, copa_raw, jugadores) if copa_raw is not None else None
    out = {
        "id": c["id"],
        "nombre": nuestro,
        "corto": c["corto"],
        "categoria": c["categoria"],
        "liga": c["liga"],
        "fuente": url_jornada(c, 1),
        "clasificacion": [
            {"equipo": f[1], "pj": int(f[3]), "pg": int(f[4]), "pp": int(f[5]), "sf": int(f[6]), "sc": int(f[7]), "pts": int(f[2])}
            for f in tabla
        ],
        "partidos": partidos,
        "jugadores": list(jugadores.values()),
    }
    if copa is not None:
        out["copa"] = copa
    return out


# ---------------- Copa (cuadro de eliminatorias) ----------------

def leer_copa(c):
    """Devuelve la lista de encuentros (JSON que la Federación incrusta en cada partido del cuadro)."""
    soup = descargar(f"{BASE}/Home/CuadroLiga?faseId={c['copa_fase']}")
    out = []
    for s in soup.select("script.partido-data"):
        try:
            out.append(json.loads(s.string or s.get_text()))
        except ValueError:
            continue
    return out


def procesar_copa(c, encuentros, jugadores):
    partidos = []
    for m in encuentros:
        loc, vis = (m.get("local") or "").strip(), (m.get("visitante") or "").strip()
        if not (es_nuestro(loc, c) or es_nuestro(vis, c)):
            continue
        local = es_nuestro(loc, c)
        rival = vis if local else loc
        if rival.upper() == "BYE":
            continue  # pase directo, no es partido
        fh = (m.get("fecha") or "").split()
        d, mo, y = (fh[0].split("/") + ["", "", ""])[:3] if fh else ("", "", "")
        hora = fh[1] if len(fh) > 1 and fh[1] != "00:00" else ""
        parejas = []
        for p in m.get("partidos") or []:
            mia, suya = (p["local"], p["visitante"]) if local else (p["visitante"], p["local"])
            sg = sp = 0
            sets = []
            for st in p.get("sets") or []:
                a, b = (st["local"], st["visitante"]) if local else (st["visitante"], st["local"])
                a, b = int(a or 0), int(b or 0)
                if a == 0 and b == 0:
                    continue
                sets.append(f"{a}-{b}")
                if a > b:
                    sg += 1
                else:
                    sp += 1
            if not sets:
                continue
            gano = 1 if sg > sp else 0
            sumar_jugadores(jugadores, mia, gano, sg, sp, "c")
            parejas.append({"dmp": nombre_bonito(mia), "riv": nombre_bonito(suya), "sets": " ".join(sets), "g": gano})
        rl, rv = str(m.get("resLocal", "")).strip(), str(m.get("resVisitante", "")).strip()
        jugado = bool(parejas) and rl.isdigit() and rv.isdigit()
        partidos.append({
            "ronda": m.get("ronda", ""),
            "fecha": f"{y}-{mo}-{d}" if y else "",
            "hora": hora,
            "rival": rival,
            "lugar": "Local" if local else "Visitante",
            "sede": "" if m.get("sede") in (None, "-") else m.get("sede"),
            "dmp": (int(rl) if local else int(rv)) if jugado else "",
            "riv": (int(rv) if local else int(rl)) if jugado else "",
            "parejas": parejas,
        })
    return {
        "nombre": c.get("copa_nombre", "Copa"),
        "fuente": f"{BASE}/Home/CuadroLiga?faseId={c['copa_fase']}",
        "partidos": partidos,
    }


def main():
    cfg = json.loads((DATA / "config.json").read_text(encoding="utf-8"))
    equipos = []
    for c in cfg["equipos"]:
        print(f"→ {c['id']} ({c['equipo']})")
        tabla, jornadas, previo = None, [], None
        for j in range(1, 41):
            soup = descargar(url_jornada(c, j))
            if tabla is None:
                tabla = leer_tabla(soup)
            enc = leer_encuentros(soup)
            firma = json.dumps(enc, ensure_ascii=False)
            # Pasada la última jornada, la Federación repite la última: ahí paramos
            if not enc or firma == previo:
                break
            jornadas.append((j, enc))
            previo = firma
        if not tabla or not jornadas:
            raise RuntimeError(f"Sin datos para {c['id']}: ¿ha cambiado la web de la Federación?")
        copa_raw = leer_copa(c) if c.get("copa_fase") else None
        eq = procesar(c, tabla, jornadas, copa_raw)
        print(f"   {len(eq['clasificacion'])} equipos en la tabla, {len(eq['partidos'])} partidos de liga, "
              f"{len(eq.get('copa', {}).get('partidos', []))} de copa, {len(eq['jugadores'])} jugadores")
        equipos.append(eq)

    (DATA / "equipos.json").write_text(json.dumps(equipos, ensure_ascii=False, indent=1), encoding="utf-8")
    club_p = DATA / "club.json"
    club = json.loads(club_p.read_text(encoding="utf-8"))
    club["actualizado"] = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%d/%m/%Y")
    club_p.write_text(json.dumps(club, ensure_ascii=False, indent=2), encoding="utf-8")
    print("✔ data/equipos.json actualizado")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"✘ Error: {e}", file=sys.stderr)
        sys.exit(1)
