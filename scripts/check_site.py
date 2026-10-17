#!/usr/bin/env python3
"""Check a built static site. The entry point is bash scripts/check.sh."""

from __future__ import annotations

import posixpath
import re
import sys
import urllib.parse
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

FONT_EXTENSIONS = {".woff", ".woff2", ".ttf", ".otf", ".eot"}
WEIGHTS = (
    "extralight",
    "ultralight",
    "semibold",
    "demibold",
    "extrabold",
    "ultrabold",
    "hairline",
    "regular",
    "medium",
    "italic",
    "oblique",
    "black",
    "heavy",
    "light",
    "bold",
    "thin",
    "fett",
    "roman",
    "book",
)
WEIGHT_TAIL = re.compile(
    r"(?i)(?:[-_\s]+|(?<=[a-z])(?=[A-Z]))(?:" + "|".join(sorted(WEIGHTS, key=len, reverse=True)) + r")$"
)
SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")
POSITIONAL = re.compile(
    r":(?:nth-child|nth-last-child|nth-of-type|nth-last-of-type|first-child|last-child|first-of-type|last-of-type)\b",
    re.I,
)
NAV_ELEMENT = re.compile(r"(^|[^A-Za-z0-9_-])nav(?![A-Za-z0-9_-])", re.I)
HIDES_FROM_TREE = re.compile(
    r"(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\b",
    re.I,
)
NESTED_AT = {"media", "supports", "container", "layer"}


@dataclass
class Finding:
    code: str
    detail: str

    def __str__(self) -> str:
        return f"{self.code}: {self.detail}"


@dataclass
class Page:
    rel: str
    ids: dict[str, str] = field(default_factory=dict)
    hrefs: list[tuple[int, str]] = field(default_factory=list)
    images: list[tuple[int, str, bool]] = field(default_factory=list)
    passwords: list[int] = field(default_factory=list)
    forms: list[int] = field(default_factory=list)
    controls: list[tuple[int, str, str]] = field(default_factory=list)


@dataclass
class Site:
    root: Path
    pages: list[Page]
    css: list[tuple[str, str]]
    fonts: list[Path]
    licenses: list[Path]


class Collector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.page = Page(rel="")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {key.lower(): "" if value is None else value for key, value in attrs}
        line = self.getpos()[0]
        role = attr.get("role", "").strip().lower()
        element_id = attr.get("id", "")
        if element_id and element_id not in self.page.ids:
            self.page.ids[element_id] = role
        if tag in {"a", "link", "area"} and "href" in attr:
            self.page.hrefs.append((line, attr["href"].strip()))
        if tag == "img":
            self.page.images.append((line, attr.get("src", ""), "alt" in attr))
        if tag == "input" and attr.get("type", "").strip().lower() == "password":
            self.page.passwords.append(line)
        if tag == "form":
            self.page.forms.append(line)
        if "aria-controls" in attr:
            self.page.controls.append((line, role, attr["aria-controls"]))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def show(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def load_site(root: Path) -> Site:
    pages: list[Page] = []
    for path in sorted(root.rglob("*.html")):
        if not path.is_file():
            continue
        collector = Collector()
        collector.feed(read_text(path))
        collector.page.rel = path.relative_to(root).as_posix()
        pages.append(collector.page)
    css: list[tuple[str, str]] = []
    for path in sorted(root.rglob("*.css")):
        if path.is_file():
            css.append((path.relative_to(root).as_posix(), read_text(path)))
    fonts: list[Path] = []
    licenses: list[Path] = []
    font_dir = root / "fonts"
    if font_dir.is_dir():
        for path in sorted(font_dir.iterdir()):
            if not path.is_file():
                continue
            if path.suffix.lower() in FONT_EXTENSIONS:
                fonts.append(path)
            elif path.name.lower().startswith(("license", "ofl", "copying")):
                licenses.append(path)
    return Site(root=root, pages=pages, css=css, fonts=fonts, licenses=licenses)


def family_key(filename: str) -> str:
    stem = Path(filename).stem
    while True:
        match = WEIGHT_TAIL.search(stem)
        if not match or match.start() == 0:
            break
        stem = stem[: match.start()]
    return re.sub(r"[^a-z0-9]", "", stem.lower())


def license_key(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"(?i)^(license|ofl|copying)[-_]?", "", stem)
    return re.sub(r"[^a-z0-9]", "", stem.lower())


def public_path(rel: str) -> str:
    return "/" + rel


def url_candidates(url_path: str) -> list[str]:
    path = urllib.parse.unquote(url_path)
    path = path.split("?", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    path = posixpath.normpath(path)
    if path == "/":
        return ["index.html"]
    rel = path.lstrip("/")
    if rel.endswith("/"):
        return [rel + "index.html"]
    options = [rel]
    if "." not in posixpath.basename(rel):
        options.append(rel + ".html")
        options.append(rel + "/index.html")
    return options


def file_for(root: Path, rel: str) -> Path | None:
    root_real = root.resolve()
    candidate = (root_real / rel).resolve()
    if candidate != root_real and root_real not in candidate.parents:
        return None
    if candidate.is_file():
        return candidate
    return None


def resolve_page(root: Path, url_path: str) -> Path | None:
    for rel in url_candidates(url_path):
        found = file_for(root, rel)
        if found is not None:
            return found
    return None


def is_external(href: str) -> bool:
    if href.startswith("//"):
        return True
    return SCHEME.match(href) is not None


def split_href(href: str) -> tuple[str, str]:
    path, fragment = (href.split("#", 1) + [""])[:2]
    return path, urllib.parse.unquote(fragment)


def join_internal(page_rel: str, href_path: str) -> str:
    if href_path.startswith("/"):
        return href_path
    base = posixpath.dirname(public_path(page_rel))
    if not base.endswith("/"):
        base += "/"
    joined = posixpath.normpath(posixpath.join(base, href_path or "."))
    if not joined.startswith("/"):
        joined = "/" + joined
    return joined


def check_links(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    pages_by_rel = {page.rel: page for page in site.pages}
    for page in site.pages:
        for line, href in page.hrefs:
            if href == "" or is_external(href):
                continue
            href_path, fragment = split_href(href)
            target_url = join_internal(page.rel, href_path) if href_path else public_path(page.rel)
            target = resolve_page(site.root, target_url)
            where = f"{page.rel}:{line}: href {show(href)}"
            if target is None:
                findings.append(Finding("link", f"{where} does not match a file"))
                continue
            if fragment == "":
                continue
            target_rel = target.relative_to(site.root.resolve()).as_posix()
            target_page = pages_by_rel.get(target_rel)
            if target_page is None:
                findings.append(Finding("link", f"{where} points at a non-html file"))
                continue
            if fragment not in target_page.ids:
                findings.append(Finding("link", f"{where} has no id {show(fragment)}"))
    return findings


def check_forms(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    for page in site.pages:
        for line in page.forms:
            findings.append(
                Finding(
                    "form",
                    f"{page.rel}:{line}: form on a static site with no backend",
                )
            )
        for line in page.passwords:
            findings.append(
                Finding(
                    "password",
                    f"{page.rel}:{line}: input type=\"password\" on a static site",
                )
            )
    return findings


def check_fonts(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    by_key: dict[str, list[Path]] = {}
    for lic in site.licenses:
        key = license_key(lic.name)
        if key:
            by_key.setdefault(key, []).append(lic)
    for font in site.fonts:
        key = family_key(font.name)
        rel = font.relative_to(site.root).as_posix()
        matches = by_key.get(key, [])
        if not matches:
            findings.append(
                Finding(
                    "font",
                    f"{rel}: no LICENSE file matches family {show(key)} "
                    f"(add fonts/LICENSE-{key}.txt)",
                )
            )
            continue
        texts = []
        for lic in matches:
            try:
                texts.append(read_text(lic))
            except OSError:
                texts.append("")
        if not any("license" in text.lower() for text in texts):
            names = ", ".join(lic.relative_to(site.root).as_posix() for lic in matches)
            findings.append(Finding("font", f"{rel}: {names} has no license text"))
    return findings


def check_images(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    for page in site.pages:
        for line, src, has_alt in page.images:
            if has_alt:
                continue
            source = f" src={show(src)}" if src else ""
            findings.append(Finding("img", f"{page.rel}:{line}: img{source} has no alt attribute"))
    return findings


def check_aria(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    for page in site.pages:
        for line, role, raw in page.controls:
            for idref in raw.split():
                where = f"{page.rel}:{line}: aria-controls={show(idref)}"
                if idref not in page.ids:
                    findings.append(Finding("aria", f"{where} does not match an id"))
                    continue
                if role != "tab":
                    continue
                target_role = page.ids[idref]
                if target_role != "tabpanel":
                    shown = target_role or "none"
                    findings.append(
                        Finding(
                            "aria",
                            f"{where} on role=\"tab\" targets role {show(shown)}, expected \"tabpanel\"",
                        )
                    )
    return findings


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def iter_style_rules(css: str, line_offset: int = 1):
    n = len(css)
    i = 0
    while i < n:
        start = css.find("{", i)
        if start < 0:
            return
        prelude = css[i:start]
        depth = 1
        j = start + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        end = j - 1 if depth == 0 else j
        body = css[start + 1 : end]
        next_i = j
        head = prelude.strip()
        rule_line = line_offset + css[:start].count("\n")
        at = re.match(r"@([A-Za-z-]+)", head)
        if at:
            if at.group(1).lower() in NESTED_AT:
                body_line = line_offset + css[: start + 1].count("\n")
                yield from iter_style_rules(body, body_line)
        elif head:
            yield rule_line, head, body
        i = next_i


def split_selectors(selector: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for char in selector:
        if char == "(":
            depth += 1
        elif char == ")" and depth:
            depth -= 1
        if char == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
            continue
        buf.append(char)
    parts.append("".join(buf))
    return parts


def check_nav(site: Site) -> list[Finding]:
    findings: list[Finding] = []
    for rel, text in site.css:
        for line, selector, body in iter_style_rules(strip_comments(text)):
            if not HIDES_FROM_TREE.search(body):
                continue
            for part in split_selectors(selector):
                if POSITIONAL.search(part) and NAV_ELEMENT.search(part):
                    compact = " ".join(part.split())
                    findings.append(
                        Finding(
                            "nav",
                            f"{rel}:{line}: selector {show(compact)} hides a nav link from the accessibility tree",
                        )
                    )
    return findings


CHECKS = (
    check_links,
    check_forms,
    check_fonts,
    check_images,
    check_aria,
    check_nav,
)


def check(root: Path) -> list[Finding]:
    site = load_site(root)
    findings: list[Finding] = []
    for fn in CHECKS:
        findings.extend(fn(site))
    return findings


def self_test(fixtures: Path) -> int:
    if not fixtures.is_dir():
        print(f"check: fixtures not found at {fixtures}", file=sys.stderr)
        return 2
    failed: list[str] = []
    for case in sorted(path for path in fixtures.iterdir() if path.is_dir()):
        expect_path = case / "expect.txt"
        if not expect_path.is_file():
            print(f"--- {case.name} ---")
            print(f"missing {expect_path.name}")
            failed.append(case.name)
            continue
        needles = [line for line in expect_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        findings = check(case)
        text = "\n".join(str(item) for item in findings)
        print(f"--- {case.name} ---")
        print(text if text else "ok")
        if needles == ["ok"]:
            if findings:
                failed.append(case.name)
            continue
        if not findings or any(needle not in text for needle in needles):
            failed.append(case.name)
    if failed:
        print("self-test: failed " + ", ".join(failed))
        return 1
    print("self-test: ok")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) == 2 and argv[1] == "--self-test":
        return self_test(Path(__file__).resolve().parent / "fixtures")
    if len(argv) != 2:
        print("usage: check_site.py <dist-dir> | --self-test", file=sys.stderr)
        return 2
    root = Path(argv[1])
    if not root.is_dir():
        print(f"check: {root} is not a directory", file=sys.stderr)
        return 2
    findings = check(root)
    for item in findings:
        print(item)
    if findings:
        return 1
    site = load_site(root)
    hrefs = sum(len(page.hrefs) for page in site.pages)
    images = sum(len(page.images) for page in site.pages)
    print(
        f"ok: {root} ({len(site.pages)} html, {hrefs} hrefs, {images} img, {len(site.fonts)} fonts)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
