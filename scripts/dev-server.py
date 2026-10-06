#!/usr/bin/env python3
"""小青囊 H5 服务核心：前台、后台、SQLite、登录、内容发布与素材。"""

from http import cookies
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import hmac
import importlib.util
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import ssl
import tempfile
import time
from urllib.parse import parse_qs, unquote, urlparse
import urllib.request
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
WEB_DIR = ROOT / "unpackage" / "dist" / "build" / "web"
RUNTIME_DIR = ROOT / ".runtime"
DATABASE_FILE = Path(os.environ.get("XQN_DATABASE_FILE", RUNTIME_DIR / "content.db"))
UPLOAD_DIR = Path(os.environ.get("XQN_UPLOAD_DIR", RUNTIME_DIR / "uploads"))
SCHEMA_FILE = ROOT / "database" / "schema.sql"
SESSION_COOKIE = "xqn_admin_session"
SESSION_SECONDS = 12 * 60 * 60
MAX_BODY = 2 * 1024 * 1024
MAX_UPLOAD = 120 * 1024 * 1024

PUBLIC_BANNED_WORDS = (
    "治疗", "根治", "治愈", "疗效", "诊断", "处方", "患者", "治好了",
    "疾病调理", "包治", "药到病除", "立刻见效", "永不复发"
)
VALID_AREA_IDS = {
    "head", "occiput", "forehead", "temple", "eye", "ear", "cheek", "nose", "mouth", "jaw",
    "neck", "shoulder", "chest", "breast", "nipple-areola", "abdomen", "pelvis", "upper-back",
    "lower-back", "buttocks", "upper-arm", "elbow", "forearm", "hand", "thigh", "knee",
    "lower-leg", "foot", "vulva", "penis", "scrotum", "perineum", "anus", "whole"
}
LEGACY_AREA_MAP = {
    "腰部": "lower-back", "腰骶部": "lower-back", "后腰": "lower-back", "腰": "lower-back",
    "腹部": "abdomen", "肚子": "abdomen", "足底": "foot", "脚": "foot", "头部": "head",
    "头面部": "head", "颈部": "neck", "肩部": "shoulder", "全身": "whole"
}

ADMIN_PERMISSION_SEED = (
    ("methods.read", "查看方法库", "基础数据库", 10),
    ("methods.write", "编辑方法库", "基础数据库", 20),
    ("methods.publish", "发布方法", "基础数据库", 30),
    ("problems.read", "查看问题库", "基础数据库", 40),
    ("problems.write", "编辑问题库", "基础数据库", 50),
    ("points.read", "查看穴位库", "基础数据库", 60),
    ("points.write", "编辑穴位库", "基础数据库", 70),
    ("articles.read", "查看文章管理", "青囊文集", 100),
    ("articles.write", "编辑文章", "青囊文集", 110),
    ("articles.publish", "发布文章", "青囊文集", 120),
    ("columns.manage", "管理专栏", "青囊文集", 130),
    ("source.manage", "来源同步与审核", "青囊文集", 140),
    ("backup.export", "导出备份", "系统工具", 300),
    ("logs.read", "查看操作记录", "系统工具", 310),
    ("permissions.manage", "管理管理员权限", "系统工具", 320),
)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """兼容服务器自带的 Python 3.6，同时避免一个请求阻塞其他访问。"""

    daemon_threads = True


class MethodHtmlSanitizer(HTMLParser):
    allowed_tags = {"p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "img", "video"}
    void_tags = {"br", "img"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "iframe", "object"}:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in self.allowed_tags:
            return
        safe_attrs = []
        values = dict(attrs)
        if tag in {"img", "video"}:
            src = values.get("src", "").strip()
            if src.startswith(("/media/", "https://", "http://")):
                safe_attrs.append(("src", src))
            if tag == "img" and values.get("alt"):
                safe_attrs.append(("alt", values["alt"]))
            if tag == "video":
                safe_attrs.append(("controls", ""))
        if tag == "p" and values.get("class") == "media-caption":
            safe_attrs.append(("class", "media-caption"))
        rendered = "".join(f' {name}="{escape(value, quote=True)}"' if value else f" {name}" for name, value in safe_attrs)
        self.parts.append(f"<{tag}{rendered}>")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "iframe", "object"}:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if not self.skip_depth and tag in self.allowed_tags and tag not in self.void_tags:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(escape(data))


def sanitize_method_html(value):
    parser = MethodHtmlSanitizer()
    parser.feed(str(value or ""))
    parser.close()
    return "".join(parser.parts).strip()


def method_plain_text(value):
    return unescape(re.sub(r"<[^>]+>", " ", str(value or ""))).replace("\xa0", " ").strip()


_PROMOTION_TEXT = re.compile(
    r"报名方式|报名客服|付费报名|交费报名|联系客服|详询客服|"
    r"扫码.{0,20}(报名|购买|付款)|扫.{0,20}二维码.{0,20}(报名|交费)|"
    r"长按.{0,20}二维码.{0,20}(报名|购买|付款)|"
    r"微信号[：:]|微信号码|收费课程|付费培训|限量招募|名额有限|"
    r"拉微信群|长按识别下方二维码|微店.{0,20}(下单|购买)|文章后面有微店",
    re.I,
)
_PROMOTION_BLOCK = re.compile(r"<(p|h[1-6]|li)\b[^>]*>.*?</\1\s*>", re.I | re.S)


def clean_imported_article_html(source):
    """保守清理明确的商业段落；长段落和疑似图片推广交人工复核。"""
    source = str(source or "")
    spans, removed, flags = [], [], []
    for match in _PROMOTION_BLOCK.finditer(source):
        text = method_plain_text(match.group())
        if not text or not _PROMOTION_TEXT.search(text):
            continue
        if len(text) > 500:
            flags.append("含商业内容，需人工复核")
            continue
        end = match.end()
        media = re.match(r"\s*(?:<img\b[^>]*>\s*)+", source[end:], re.I)
        if media and re.search(r"二维码|扫码|微信号|报名", text):
            end += media.end()
            flags.append("推广附近图片需人工确认")
        spans.append((match.start(), end))
        removed.append(text)
    for start, end in reversed(spans):
        source = source[:start] + source[end:]
    if re.search(r"二维码|报名|购买|付款|微店|课程", method_plain_text(source)):
        flags.append("推广附近图片需人工确认")
    return source, removed, list(dict.fromkeys(flags))


def now_ms():
    return int(time.time() * 1000)


def db():
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Python 3.6 的 sqlite3 尚不接受 pathlib.Path。
    connection = sqlite3.connect(str(DATABASE_FILE), timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA journal_mode=WAL")
    return connection


def initialize():
    with db() as connection:
        connection.executescript(SCHEMA_FILE.read_text(encoding="utf-8"))
        now = now_ms()
        for code, label, group_name, sort_order in ADMIN_PERMISSION_SEED:
            connection.execute(
                "INSERT OR REPLACE INTO admin_permission_catalog(code,label,permission_group,sort_order) VALUES(?,?,?,?)",
                (code, label, group_name, sort_order),
            )
        users = connection.execute("SELECT id FROM admin_users ORDER BY created_at,id").fetchall()
        for index, row in enumerate(users):
            connection.execute(
                "INSERT OR IGNORE INTO admin_user_access(user_id,account_type,created_at,updated_at) VALUES(?,?,?,?)",
                (row["id"], "super_admin" if index == 0 else "admin", now, now),
            )
        connection.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (now_ms(),))


def hash_password(password, salt_hex):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 310_000).hex()


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def split_values(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in re.split(r"[\n,，;；]+", str(value or "")) if item.strip()]


def normalize_content_payload(content):
    value = dict(content or {})
    value["type"] = "article" if value.get("type") == "article" else "skill"
    value["contentHtml"] = value.get("contentHtml") or value.get("methodContentHtml") or ""
    if not value.get("casesHtml") and isinstance(value.get("cases"), list):
        parts = []
        labels = (("background", "情况"), ("methodUsed", "做法"), ("duration", "时间"),
                  ("subjectiveRecord", "记录"), ("limitations", "局限"), ("sourceLocator", "出处"))
        for index, case in enumerate(value.get("cases")):
            if not isinstance(case, dict):
                continue
            parts.append("<h3>案例 {}</h3>".format(index + 1))
            for key, label in labels:
                if str(case.get(key, "")).strip():
                    parts.append("<p><strong>{}：</strong>{}</p>".format(label, escape(str(case[key]))))
        value["casesHtml"] = "".join(parts)
    value["casesHtml"] = value.get("casesHtml") or ""
    raw_areas = split_values(value.get("bodyAreaIds"))
    if not raw_areas and value.get("bodyArea"):
        raw_areas = [str(value.get("bodyArea")).strip()]
    areas = []
    for area in raw_areas:
        area_id = area if area in VALID_AREA_IDS else LEGACY_AREA_MAP.get(area, "")
        if area_id and area_id not in areas:
            areas.append(area_id)
    value["bodyAreaIds"] = areas
    # 问题—方法、方法—穴位的关联保存在独立关系表，不复制进正文 JSON。
    value.pop("pointIds", None)
    value.pop("pointLinks", None)
    value.pop("problemLinks", None)
    value.pop("bodyArea", None)
    value.pop("methodContentHtml", None)
    value.pop("articleBlocks", None)
    value.pop("steps", None)
    value.pop("methodLocation", None)
    value.pop("contactMethod", None)
    value.pop("cases", None)
    return value


def normalize_point_payload(point):
    value = dict(point or {})
    value["id"] = str(value.get("id", "")).strip()
    value["name"] = str(value.get("name", "")).strip()
    value["aliases"] = split_values(value.get("aliases"))
    value["bodyAreaId"] = str(value.get("bodyAreaId", "")).strip()
    value["professionalLocation"] = str(value.get("professionalLocation", "")).strip()
    value["everydayLocation"] = str(value.get("everydayLocation", "")).strip()
    value["contentHtml"] = sanitize_method_html(value.get("contentHtml"))
    value["commonMistakes"] = str(value.get("commonMistakes", "")).strip()
    value["notices"] = str(value.get("notices", "")).strip()
    value["sourceTitle"] = str(value.get("sourceTitle", "")).strip()
    value["sourceText"] = str(value.get("sourceText", "")).strip()
    value["sourceNotes"] = str(value.get("sourceNotes", "")).strip()
    return value


def validate_point(point):
    point = normalize_point_payload(point)
    required = ("id", "name", "bodyAreaId", "professionalLocation", "everydayLocation",
                "contentHtml", "sourceTitle", "sourceText")
    missing = [key for key in required if not str(point.get(key, "")).strip()]
    if point.get("bodyAreaId") not in VALID_AREA_IDS:
        missing.append("bodyAreaId")
    return sorted(set(missing))


def normalize_problem_payload(problem):
    value = dict(problem or {})
    value["id"] = str(value.get("id", "")).strip()
    value["name"] = str(value.get("name", "")).strip()
    value["aliases"] = split_values(value.get("aliases"))
    value["description"] = str(value.get("description", "")).strip()
    value["bodyAreaIds"] = [item for item in dict.fromkeys(split_values(value.get("bodyAreaIds")))
                            if item in VALID_AREA_IDS]
    value["notes"] = str(value.get("notes", "")).strip()
    return value


def validate_problem(problem):
    problem = normalize_problem_payload(problem)
    missing = []
    if not problem.get("id"):
        missing.append("id")
    if not problem.get("name"):
        missing.append("name")
    if not problem.get("bodyAreaIds"):
        missing.append("bodyAreaIds")
    return missing


def normalize_point_links(value):
    values, seen = [], set()
    for index, item in enumerate(value if isinstance(value, list) else []):
        if not isinstance(item, dict):
            continue
        point_id = str(item.get("pointId", "")).strip()
        if not point_id or point_id in seen:
            continue
        seen.add(point_id)
        values.append({"pointId": point_id, "order": index,
                       "instruction": str(item.get("instruction", "")).strip()})
    return values


def normalize_problem_links(value):
    valid_evidence = {"direct", "case", "author", "pending"}
    values, seen = [], set()
    for index, item in enumerate(value if isinstance(value, list) else []):
        if not isinstance(item, dict):
            continue
        problem_id = str(item.get("problemId", "")).strip()
        if not problem_id or problem_id in seen:
            continue
        seen.add(problem_id)
        evidence_type = str(item.get("evidenceType", "pending"))
        values.append({"problemId": problem_id, "order": index,
                       "evidenceType": evidence_type if evidence_type in valid_evidence else "pending",
                       "evidenceText": str(item.get("evidenceText", "")).strip()})
    return values


def content_point_links(connection, content_id, verified_only=False):
    values = []
    rows = connection.execute(
        """SELECT p.payload_json,p.status,l.point_id,l.sort_order,l.instruction
           FROM content_point_links l JOIN admin_points p ON p.id=l.point_id
           WHERE l.content_id=? ORDER BY l.sort_order,p.name""", (content_id,)
    ).fetchall()
    for row in rows:
        if verified_only and row["status"] != "verified":
            continue
        point = normalize_point_payload(json.loads(row["payload_json"]))
        point["status"] = row["status"]
        values.append({"pointId": row["point_id"], "order": row["sort_order"],
                       "instruction": row["instruction"], "point": point})
    return values


def content_problem_links(connection, content_id, verified_only=False):
    rows = connection.execute(
        """SELECT p.payload_json,p.status,l.problem_id,l.sort_order,l.evidence_type,l.evidence_text
           FROM problem_content_links l JOIN admin_problems p ON p.id=l.problem_id
           WHERE l.content_id=? ORDER BY l.sort_order,p.name""", (content_id,)
    ).fetchall()
    values = []
    for row in rows:
        if verified_only and row["status"] != "verified":
            continue
        values.append({"problemId": row["problem_id"], "order": row["sort_order"],
                       "evidenceType": row["evidence_type"], "evidenceText": row["evidence_text"],
                       "problem": normalize_problem_payload(json.loads(row["payload_json"]))})
    return values


def public_copy_text(content):
    case_text = method_plain_text(content.get("casesHtml", ""))
    return " ".join([
        str(content.get("title", "")), str(content.get("summary", "")),
        method_plain_text(content.get("contentHtml", "")), str(content.get("usageScope", "")),
        str(content.get("notices", "")), str(content.get("outsideScope", "")),
        str(content.get("helpConditions", "")), case_text
    ])


def content_compliance_issues(content):
    text = public_copy_text(content)
    return [word for word in PUBLIC_BANNED_WORDS if word in text]


def validate_content(content):
    content = normalize_content_payload(content)
    required = ["id", "type", "title", "contentHtml", "sourceTitle", "sourceText"]
    if content.get("type") == "skill":
        required.extend(["methodName", "methodType", "materials", "usageScope", "outsideScope", "helpConditions"])
    missing = [key for key in required if not str(content.get(key, "")).strip()]
    if content.get("type") not in ("article", "skill"):
        missing.append("type")
    if content.get("type") == "skill" and not content.get("bodyAreaIds"):
        missing.append("bodyAreaIds")
    if not method_plain_text(content.get("contentHtml")):
        missing.append("contentHtml")
    # 文集负责舒适阅读与观点留存，不把原文自动包装成可操作方法。
    # 强效果词等合规拦截只作用于“养护方法”；文章由阅读边界和复核等级提示风险。
    if content.get("type") == "skill" and content_compliance_issues(content):
        missing.append("compliance")
    return sorted(set(missing))


def public_contents(connection, page=1, page_size=24, include_body=False, content_id=None):
    params = []
    where = "status='published'"
    if content_id:
        where += " AND id=?"
        params.append(content_id)
    total = connection.execute(f"SELECT COUNT(*) FROM admin_contents WHERE {where}", params).fetchone()[0]
    if content_id:
        rows = connection.execute(f"SELECT payload_json FROM admin_contents WHERE {where} LIMIT 1", params).fetchall()
    else:
        page = max(1, int(page or 1))
        page_size = min(60, max(1, int(page_size or 24)))
        params.extend([page_size, (page - 1) * page_size])
        rows = connection.execute(
            f"SELECT payload_json FROM admin_contents WHERE {where} ORDER BY published_at DESC LIMIT ? OFFSET ?", params
        ).fetchall()
    values = []
    for row in rows:
        value = normalize_content_payload(json.loads(row["payload_json"]))
        if validate_content(value):
            continue
        # 旧项目图片仍保留在同一资源站，但旧子域的 HTTPS 入口已失效。
        # 列表卡片直接使用 coverImage，需与正文渲染保持同样的域名迁移规则。
        cover_image = str(value.get("coverImage") or "")
        if cover_image.startswith("https://zibingziyi.zengshiwuyu.cn/"):
            value["coverImage"] = cover_image.replace(
                "https://zibingziyi.zengshiwuyu.cn/",
                "https://zengshiwuyu.cn/",
                1,
            )
        if not include_body:
            # 列表只传卡片需要的字段；正文、案例和原始资料在详情接口按需读取。
            value["contentHtml"] = ""
            value["casesHtml"] = ""
            value["sourceText"] = ""
            value["sourceNotes"] = ""
        value["pointLinks"] = content_point_links(connection, value["id"], True)
        value["problemLinks"] = content_problem_links(connection, value["id"], True)
        values.append(value)
    return values, total


class Handler(SimpleHTTPRequestHandler):
    server_version = "XiaoQingNang/1.0"

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        if self.path.startswith(("/api/admin", "/admin/")):
            cache_control = "no-store"
        elif self.path.startswith("/assets/"):
            cache_control = "public, max-age=31536000, immutable"
        else:
            cache_control = "no-cache"
        self.send_header("Cache-Control", cache_control)
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - {fmt % args}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        # 静态开发服务器不得暴露数据库、源文档、脚本和版本库。
        protected = ("/.runtime", "/.git", "/database", "/docs", "/scripts", "/AGENTS.md", "/CLAUDE.md")
        if parsed.path.startswith(protected):
            return self.send_json(404, {"error": "资源不存在"})
        if parsed.path == "/api/published-content":
            with db() as connection:
                columns = [dict(row) for row in connection.execute("SELECT id,name,description,color,sort_order,status FROM anthology_columns WHERE status='visible' ORDER BY sort_order,name")]
                query = parse_qs(parsed.query)
                page = int((query.get("page") or ["1"])[0])
                page_size = int((query.get("pageSize") or ["24"])[0])
                values, total = public_contents(connection, page, page_size, False)
                return self.send_json(200, {"contents": values, "columns": columns, "page": page, "pageSize": min(60, max(1, page_size)), "total": total, "hasMore": page * min(60, max(1, page_size)) < total})
        match = re.fullmatch(r"/api/published-content/([^/]+)", parsed.path)
        if match:
            with db() as connection:
                values, _ = public_contents(connection, include_body=True, content_id=unquote(match.group(1)))
                if not values:
                    return self.send_json(404, {"error": "内容不存在"})
                return self.send_json(200, {"content": values[0]})
        if parsed.path == "/api/admin/bootstrap":
            return self.bootstrap()
        if parsed.path == "/api/admin/contents":
            return self.list_contents()
        match = re.fullmatch(r"/api/admin/contents/([^/]+)", parsed.path)
        if match:
            return self.get_content(unquote(match.group(1)))
        if parsed.path == "/api/admin/columns":
            return self.list_columns()
        if parsed.path == "/api/admin/points":
            return self.list_points()
        if parsed.path == "/api/admin/problems":
            return self.list_problems()
        if parsed.path == "/api/admin/logs":
            return self.list_logs()
        if parsed.path == "/api/admin/export":
            return self.export_data()
        if parsed.path.startswith("/media/"):
            return self.serve_media(parsed.path)
        if parsed.path == "/api/image-proxy":
            return self.serve_remote_image(parse_qs(parsed.query))
        if parsed.path == "/admin":
            self.send_response(308)
            self.send_header("Location", "/admin/")
            self.end_headers()
            return
        if parsed.path.startswith("/admin/"):
            return super().do_GET()
        return self.serve_web(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        # 正式环境由 Nginx 标注协议；后台凭据和内容不得通过明文 HTTP 提交。
        forwarded_proto = self.headers.get("X-Forwarded-Proto", "").split(",", 1)[0].strip().lower()
        if parsed.path.startswith(("/api/admin/", "/api/upload")) and forwarded_proto and forwarded_proto != "https":
            return self.send_json(426, {"error": "账号操作必须使用 HTTPS"})
        if parsed.path == "/api/admin/setup":
            return self.setup_admin()
        if parsed.path == "/api/admin/login":
            return self.login()
        if parsed.path == "/api/admin/logout":
            return self.logout()
        if parsed.path == "/api/admin/contents":
            return self.save_content()
        if parsed.path == "/api/admin/columns":
            return self.save_column()
        match = re.fullmatch(r"/api/admin/columns/([^/]+)/delete", parsed.path)
        if match:
            return self.delete_column(unquote(match.group(1)))
        if parsed.path == "/api/admin/import-docx":
            return self.import_docx(parsed)
        if parsed.path == "/api/admin/points":
            return self.save_point()
        if parsed.path == "/api/admin/problems":
            return self.save_problem()
        match = re.fullmatch(r"/api/admin/points/([^/]+)/(verify|archive)", parsed.path)
        if match:
            return self.change_point_status(unquote(match.group(1)), match.group(2))
        match = re.fullmatch(r"/api/admin/problems/([^/]+)/(verify|archive)", parsed.path)
        if match:
            return self.change_problem_status(unquote(match.group(1)), match.group(2))
        match = re.fullmatch(r"/api/admin/contents/([^/]+)/(publish|withdraw|archive|restore)", parsed.path)
        if match:
            return self.change_status(unquote(match.group(1)), match.group(2))
        if parsed.path == "/api/upload":
            return self.save_upload(parsed)
        return self.send_json(404, {"error": "接口不存在"})

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY:
            raise ValueError("请求内容为空或过大")
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def current_session(self, connection):
        jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        morsel = jar.get(SESSION_COOKIE)
        if not morsel:
            return None
        return connection.execute(
            """SELECT s.user_id,s.csrf_token,u.username FROM admin_sessions s
               JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?""",
            (token_hash(morsel.value), now_ms())
        ).fetchone()

    def require_session(self, connection, write=False):
        session = self.current_session(connection)
        if not session:
            self.send_json(401, {"error": "请先登录"})
            return None
        if write and not hmac.compare_digest(self.headers.get("X-CSRF-Token", ""), session["csrf_token"]):
            self.send_json(403, {"error": "安全校验失败，请刷新页面后重试"})
            return None
        return session

    def issue_session(self, connection, user_id):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
        now = now_ms()
        connection.execute("DELETE FROM admin_sessions WHERE user_id=? OR expires_at<?", (user_id, now))
        connection.execute(
            "INSERT INTO admin_sessions(token_hash,user_id,csrf_token,expires_at,created_at) VALUES(?,?,?,?,?)",
            (token_hash(token), user_id, csrf, now + SESSION_SECONDS * 1000, now)
        )
        return token, csrf

    def set_session_cookie(self, token, max_age=SESSION_SECONDS):
        cookie = cookies.SimpleCookie()
        cookie[SESSION_COOKIE] = token
        cookie[SESSION_COOKIE]["path"] = "/"
        cookie[SESSION_COOKIE]["httponly"] = True
        cookie[SESSION_COOKIE]["max-age"] = max_age
        if self.headers.get("X-Forwarded-Proto", "").lower() == "https":
            cookie[SESSION_COOKIE]["secure"] = True
        self.send_header("Set-Cookie", cookie.output(header="").strip() + "; SameSite=Strict")

    def audit(self, connection, user_id, action, entity_type, entity_id=None, detail=None):
        connection.execute(
            "INSERT INTO admin_audit_logs(user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?)",
            (user_id, action, entity_type, entity_id, json.dumps(detail or {}, ensure_ascii=False), now_ms())
        )

    def bootstrap(self):
        with db() as connection:
            count = connection.execute("SELECT COUNT(*) FROM admin_users").fetchone()[0]
            session = self.current_session(connection)
            return self.send_json(200, {"needsSetup": count == 0, "authenticated": bool(session),
                                        "username": session["username"] if session else None,
                                        "csrfToken": session["csrf_token"] if session else None})

    def setup_admin(self):
        try:
            payload = self.read_json()
            username, password = str(payload.get("username", "")).strip(), str(payload.get("password", ""))
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        if len(username) < 3 or not re.fullmatch(r"[A-Za-z0-9_.-]+", username):
            return self.send_json(422, {"error": "用户名至少3位，只能使用字母、数字、点、横线和下划线"})
        if len(password) < 8:
            return self.send_json(422, {"error": "密码至少8位"})
        with db() as connection:
            if connection.execute("SELECT COUNT(*) FROM admin_users").fetchone()[0]:
                return self.send_json(409, {"error": "管理员已经创建"})
            user_id, salt = "ADM-" + uuid4().hex, secrets.token_hex(16)
            connection.execute("INSERT INTO admin_users VALUES(?,?,?,?,?,?)", (user_id, username, hash_password(password, salt), salt, now_ms(), None))
            token, csrf = self.issue_session(connection, user_id)
            self.audit(connection, user_id, "setup", "admin_user", user_id)
            connection.commit()
        return self.send_json(201, {"ok": True, "username": username, "csrfToken": csrf}, cookie=token)

    def login(self):
        try:
            payload = self.read_json()
            username, password = str(payload.get("username", "")).strip(), str(payload.get("password", ""))
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            return self.send_json(400, {"error": "登录信息无法读取"})
        time.sleep(0.25)
        with db() as connection:
            user = connection.execute("SELECT * FROM admin_users WHERE username=?", (username,)).fetchone()
            if not user or not hmac.compare_digest(user["password_hash"], hash_password(password, user["password_salt"])):
                return self.send_json(401, {"error": "用户名或密码不正确"})
            token, csrf = self.issue_session(connection, user["id"])
            connection.execute("UPDATE admin_users SET last_login_at=? WHERE id=?", (now_ms(), user["id"]))
            self.audit(connection, user["id"], "login", "admin_user", user["id"])
            connection.commit()
        return self.send_json(200, {"ok": True, "username": username, "csrfToken": csrf}, cookie=token)

    def logout(self):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
            connection.execute("DELETE FROM admin_sessions WHERE token_hash=?", (token_hash(jar[SESSION_COOKIE].value),))
            self.audit(connection, session["user_id"], "logout", "admin_user", session["user_id"])
            connection.commit()
        return self.send_json(200, {"ok": True}, cookie="", cookie_max_age=0)

    def list_contents(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            rows = connection.execute("SELECT payload_json,status,version,updated_at,published_at FROM admin_contents ORDER BY updated_at DESC").fetchall()
            values = []
            for row in rows:
                value = normalize_content_payload(json.loads(row["payload_json"]))
                value.update(status=row["status"], version=row["version"], updatedAt=row["updated_at"], publishedAt=row["published_at"])
                value["pointLinks"] = content_point_links(connection, value["id"])
                value["problemLinks"] = content_problem_links(connection, value["id"])
                value["contentHtml"] = ""
                value["casesHtml"] = ""
                value["sourceText"] = ""
                value["sourceNotes"] = ""
                values.append(value)
            return self.send_json(200, {"contents": values})

    def get_content(self, content_id):
        with db() as connection:
            if not self.require_session(connection):
                return
            row = connection.execute("SELECT payload_json,status,version,updated_at,published_at FROM admin_contents WHERE id=?", (content_id,)).fetchone()
            if not row:
                return self.send_json(404, {"error": "内容不存在"})
            value = normalize_content_payload(json.loads(row["payload_json"]))
            value.update(status=row["status"], version=row["version"], updatedAt=row["updated_at"], publishedAt=row["published_at"])
            value["pointLinks"] = content_point_links(connection, content_id)
            value["problemLinks"] = content_problem_links(connection, content_id)
            return self.send_json(200, {"content": value})

    def ensure_columns(self, connection):
        if connection.execute("SELECT COUNT(*) FROM anthology_columns").fetchone()[0]:
            return
        names = []
        for row in connection.execute("SELECT payload_json FROM admin_contents"):
            try:
                value = json.loads(row[0])
                name = str(value.get("columnName", "")).strip()
                if value.get("type") == "article" and name and name not in names:
                    names.append(name)
            except (TypeError, ValueError):
                pass
        palette = ["#DCEEDB", "#FFF0C9", "#F2E7FA", "#FFE1D7", "#DDEFF0", "#F6E5CB"]
        now = now_ms()
        for index, name in enumerate(names):
            column_id = "COL-" + hashlib.sha256(name.encode("utf-8")).hexdigest()[:12].upper()
            connection.execute("INSERT OR IGNORE INTO anthology_columns VALUES(?,?,?,?,?,?,?,?)",
                               (column_id, name, "值得安静读完的文章与记录。", palette[index % len(palette)], index, "visible", now, now))

    def list_columns(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            self.ensure_columns(connection)
            connection.commit()
            rows = connection.execute("SELECT * FROM anthology_columns ORDER BY sort_order,name").fetchall()
            return self.send_json(200, {"columns": [dict(row) for row in rows]})

    def save_column(self):
        try:
            value = self.read_json().get("column") or {}
            name = str(value.get("name", "")).strip()
            if not name:
                raise ValueError("请填写专栏名称")
            color = str(value.get("color") or "#E8EEE9")
            if not re.fullmatch(r"#[0-9A-Fa-f]{6}", color):
                raise ValueError("请选择有效的专栏颜色")
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        column_id = str(value.get("id") or ("COL-" + uuid4().hex[:12].upper()))
        now = now_ms()
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            current = connection.execute("SELECT id FROM anthology_columns WHERE id=?", (column_id,)).fetchone()
            values = (name, str(value.get("description", "")).strip(), color, int(value.get("sort_order", 0)), "hidden" if value.get("status") == "hidden" else "visible", now)
            if current:
                connection.execute("UPDATE anthology_columns SET name=?,description=?,color=?,sort_order=?,status=?,updated_at=? WHERE id=?", values + (column_id,))
            else:
                connection.execute("INSERT INTO anthology_columns VALUES(?,?,?,?,?,?,?,?)", (column_id,) + values[:5] + (now, now))
            self.audit(connection, session["user_id"], "save", "column", column_id, {"name": name})
            connection.commit()
        return self.send_json(200, {"ok": True, "column": dict(value, id=column_id, name=name, color=color)})

    def delete_column(self, column_id):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            row = connection.execute("SELECT id,name FROM anthology_columns WHERE id=?", (column_id,)).fetchone()
            if not row:
                return self.send_json(404, {"error": "专栏不存在"})
            rows = connection.execute("SELECT id,payload_json FROM admin_contents WHERE status!='archived'").fetchall()
            detached = 0
            now = now_ms()
            for article in rows:
                value = json.loads(article["payload_json"])
                if str(value.get("columnId", "")) != column_id:
                    continue
                value["columnId"] = ""
                value["columnName"] = ""
                value["updatedAt"] = now
                connection.execute(
                    "UPDATE admin_contents SET payload_json=?,updated_at=?,version=version+1 WHERE id=?",
                    (json.dumps(value, ensure_ascii=False), now, article["id"]),
                )
                detached += 1
            connection.execute("DELETE FROM anthology_columns WHERE id=?", (column_id,))
            self.audit(connection, session["user_id"], "delete", "column", column_id,
                       {"detachedArticles": detached})
            connection.commit()
        return self.send_json(200, {"ok": True, "detachedArticles": detached})

    def list_points(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            rows = connection.execute(
                "SELECT payload_json,status,version,updated_at,verified_at FROM admin_points ORDER BY updated_at DESC"
            ).fetchall()
            values = []
            for row in rows:
                value = normalize_point_payload(json.loads(row["payload_json"]))
                value.update(status=row["status"], version=row["version"],
                             updatedAt=row["updated_at"], verifiedAt=row["verified_at"])
                values.append(value)
            return self.send_json(200, {"points": values})

    def save_point(self):
        try:
            payload = self.read_json()
            point = normalize_point_payload(payload.get("point"))
            if not point.get("id"):
                raise ValueError("穴位格式不正确")
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        point_id, now = point["id"], now_ms()
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            current = connection.execute("SELECT status,version FROM admin_points WHERE id=?", (point_id,)).fetchone()
            status = "draft"
            version = current["version"] + 1 if current else 1
            point.update(status=status, updatedAt=now, version=version)
            encoded = json.dumps(point, ensure_ascii=False)
            if current:
                connection.execute(
                    "UPDATE admin_points SET name=?,body_area_id=?,status=?,payload_json=?,updated_at=?,version=? WHERE id=?",
                    (point["name"], point["bodyAreaId"], status, encoded, now, version, point_id)
                )
            else:
                connection.execute(
                    "INSERT INTO admin_points(id,name,body_area_id,status,payload_json,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?)",
                    (point_id, point["name"], point["bodyAreaId"], status, encoded, now, now, version)
                )
            self.audit(connection, session["user_id"], "save", "point", point_id,
                       {"status": status, "version": version})
            connection.commit()
        return self.send_json(200, {"ok": True, "point": point, "missing": validate_point(point)})

    def change_point_status(self, point_id, action):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            row = connection.execute("SELECT payload_json FROM admin_points WHERE id=?", (point_id,)).fetchone()
            if not row:
                return self.send_json(404, {"error": "穴位不存在"})
            point = normalize_point_payload(json.loads(row["payload_json"]))
            if action == "verify":
                missing = validate_point(point)
                if missing:
                    return self.send_json(422, {"error": "穴位资料尚未完成", "missing": missing})
                status, verified_at = "verified", now_ms()
            else:
                status, verified_at = "archived", None
            point.update(status=status, updatedAt=now_ms(), verifiedAt=verified_at)
            connection.execute(
                "UPDATE admin_points SET status=?,payload_json=?,updated_at=?,verified_at=? WHERE id=?",
                (status, json.dumps(point, ensure_ascii=False), now_ms(), verified_at, point_id)
            )
            self.audit(connection, session["user_id"], action, "point", point_id, {"status": status})
            connection.commit()
        return self.send_json(200, {"ok": True, "point": point})

    def list_problems(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            rows = connection.execute(
                "SELECT payload_json,status,version,updated_at,verified_at FROM admin_problems ORDER BY updated_at DESC"
            ).fetchall()
            values = []
            for row in rows:
                value = normalize_problem_payload(json.loads(row["payload_json"]))
                value.update(status=row["status"], version=row["version"],
                             updatedAt=row["updated_at"], verifiedAt=row["verified_at"])
                values.append(value)
            return self.send_json(200, {"problems": values})

    def save_problem(self):
        try:
            payload = self.read_json()
            problem = normalize_problem_payload(payload.get("problem"))
            if not problem.get("id"):
                raise ValueError("问题格式不正确")
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        problem_id, now = problem["id"], now_ms()
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            current = connection.execute("SELECT status,version FROM admin_problems WHERE id=?", (problem_id,)).fetchone()
            status = "draft"
            version = current["version"] + 1 if current else 1
            problem.update(status=status, updatedAt=now, version=version)
            encoded = json.dumps(problem, ensure_ascii=False)
            if current:
                connection.execute(
                    "UPDATE admin_problems SET name=?,status=?,payload_json=?,updated_at=?,version=? WHERE id=?",
                    (problem["name"], status, encoded, now, version, problem_id)
                )
            else:
                connection.execute(
                    "INSERT INTO admin_problems(id,name,status,payload_json,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?)",
                    (problem_id, problem["name"], status, encoded, now, now, version)
                )
            self.audit(connection, session["user_id"], "save", "problem", problem_id,
                       {"status": status, "version": version})
            connection.commit()
        return self.send_json(200, {"ok": True, "problem": problem, "missing": validate_problem(problem)})

    def change_problem_status(self, problem_id, action):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            row = connection.execute("SELECT payload_json FROM admin_problems WHERE id=?", (problem_id,)).fetchone()
            if not row:
                return self.send_json(404, {"error": "问题不存在"})
            problem = normalize_problem_payload(json.loads(row["payload_json"]))
            if action == "verify":
                missing = validate_problem(problem)
                if missing:
                    return self.send_json(422, {"error": "问题资料尚未完成", "missing": missing})
                status, verified_at = "verified", now_ms()
            else:
                status, verified_at = "archived", None
            problem.update(status=status, updatedAt=now_ms(), verifiedAt=verified_at)
            connection.execute(
                "UPDATE admin_problems SET status=?,payload_json=?,updated_at=?,verified_at=? WHERE id=?",
                (status, json.dumps(problem, ensure_ascii=False), now_ms(), verified_at, problem_id)
            )
            self.audit(connection, session["user_id"], action, "problem", problem_id, {"status": status})
            connection.commit()
        return self.send_json(200, {"ok": True, "problem": problem})

    def save_content(self):
        try:
            payload = self.read_json()
            raw_content = payload.get("content") or {}
            point_links = normalize_point_links(raw_content.get("pointLinks"))
            problem_links = normalize_problem_links(raw_content.get("problemLinks"))
            content = normalize_content_payload(raw_content)
            if not isinstance(content, dict) or not str(content.get("id", "")).strip():
                raise ValueError("内容格式不正确")
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            return self.send_json(400, {"error": str(error)})
        content_id, now = str(content["id"]), now_ms()
        content["contentHtml"] = sanitize_method_html(content.get("contentHtml"))
        content["casesHtml"] = sanitize_method_html(content.get("casesHtml"))
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            current = connection.execute("SELECT status,version,created_at FROM admin_contents WHERE id=?", (content_id,)).fetchone()
            # 已发布内容只要被编辑，就必须重新人工确认后发布，不能静默覆盖前台版本。
            status = "ready" if not validate_content(content) else "draft"
            version = (current["version"] + 1) if current else 1
            content.update(status=status, updatedAt=now, version=version)
            values = (str(content.get("title", "")), str(content.get("methodName", "")), status,
                      json.dumps(content, ensure_ascii=False), now, version)
            # 服务器系统 SQLite 较旧，不支持 INSERT ... ON CONFLICT DO UPDATE。
            if current:
                connection.execute(
                    """UPDATE admin_contents SET title=?,method_name=?,status=?,payload_json=?,updated_at=?,version=?
                       WHERE id=?""",
                    values + (content_id,)
                )
            else:
                connection.execute(
                    """INSERT INTO admin_contents(id,title,method_name,status,payload_json,created_at,updated_at,version)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (content_id,) + values[:4] + (now,) + values[4:]
                )
            connection.execute("DELETE FROM content_point_links WHERE content_id=?", (content_id,))
            for link in point_links:
                connection.execute(
                    "INSERT INTO content_point_links(content_id,point_id,sort_order,instruction) VALUES(?,?,?,?)",
                    (content_id, link["pointId"], link["order"], link["instruction"])
                )
            connection.execute("DELETE FROM problem_content_links WHERE content_id=?", (content_id,))
            for link in problem_links:
                connection.execute(
                    "INSERT INTO problem_content_links(problem_id,content_id,evidence_type,evidence_text,sort_order) VALUES(?,?,?,?,?)",
                    (link["problemId"], content_id, link["evidenceType"], link["evidenceText"], link["order"])
                )
            self.audit(connection, session["user_id"], "save", "content", content_id, {"status": status, "version": version})
            connection.commit()
            content["pointLinks"] = content_point_links(connection, content_id)
            content["problemLinks"] = content_problem_links(connection, content_id)
        return self.send_json(200, {"ok": True, "content": content, "missing": validate_content(content)})

    def change_status(self, content_id, action):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            row = connection.execute("SELECT * FROM admin_contents WHERE id=?", (content_id,)).fetchone()
            if not row:
                return self.send_json(404, {"error": "内容不存在"})
            content = normalize_content_payload(json.loads(row["payload_json"]))
            if action == "publish":
                missing = validate_content(content)
                if missing:
                    return self.send_json(422, {"error": "内容尚未完成", "missing": missing})
                draft_points = connection.execute(
                    """SELECT p.name FROM content_point_links l JOIN admin_points p ON p.id=l.point_id
                       WHERE l.content_id=? AND p.status!='verified'""", (content_id,)
                ).fetchall()
                draft_problems = connection.execute(
                    """SELECT p.name FROM problem_content_links l JOIN admin_problems p ON p.id=l.problem_id
                       WHERE l.content_id=? AND p.status!='verified'""", (content_id,)
                ).fetchall()
                if draft_points or draft_problems:
                    names = [row["name"] for row in draft_points] + [row["name"] for row in draft_problems]
                    return self.send_json(422, {"error": "请先审核关联资料：" + "、".join(names)})
                status, timestamp_field = "published", "published_at"
                content.update(status=status, reviewConfirmed=True, reviewMode="self_review",
                               reviewedBy=session["username"], reviewedAt=now_ms(), publishedAt=now_ms())
            elif action == "withdraw":
                status, timestamp_field = "withdrawn", "withdrawn_at"
                content.update(status=status)
            elif action == "archive":
                status, timestamp_field = "archived", "withdrawn_at"
                content.update(status=status, archivedAt=now_ms())
            else:
                status, timestamp_field = ("ready" if not validate_content(content) else "draft"), "withdrawn_at"
                content.update(status=status, archivedAt=None)
            connection.execute(f"UPDATE admin_contents SET status=?,payload_json=?,updated_at=?,{timestamp_field}=? WHERE id=?",
                               (status, json.dumps(content, ensure_ascii=False), now_ms(), now_ms(), content_id))
            self.audit(connection, session["user_id"], action, "content", content_id, {"status": status})
            connection.commit()
            content["pointLinks"] = content_point_links(connection, content_id)
            content["problemLinks"] = content_problem_links(connection, content_id)
        return self.send_json(200, {"ok": True, "content": content})

    def import_docx(self, parsed):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_UPLOAD:
                return self.send_json(413, {"error": "Word 文件为空或超过120MB"})
            original = Path(parse_qs(parsed.query).get("name", ["article.docx"])[0]).name
            if Path(original).suffix.lower() != ".docx":
                return self.send_json(415, {"error": "目前只支持 .docx 文件"})
            data = self.rfile.read(length)
            module_path = ROOT / "scripts" / "import-anthology.py"
            spec = importlib.util.spec_from_file_location("xqn_word_import", str(module_path))
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(suffix=".docx") as temporary:
                temporary.write(data)
                temporary.flush()
                temp_path = Path(temporary.name)
                html, plain, author = module.extract_docx(temp_path, UPLOAD_DIR)
            if not html or len(plain) < 20:
                return self.send_json(422, {"error": "没有从 Word 中读取到有效正文"})
            title = re.sub(r"^\d{4}-\d{2}-\d{2}_", "", Path(original).stem).strip()
            draft = {
                "id": "CNT-" + uuid4().hex[:16].upper(), "type": "article", "title": title,
                "summary": module.summary_from(plain), "contentHtml": html,
                "sourceTitle": title, "sourceAuthor": author, "sourcePlatform": "Word 导入",
                "sourceText": "原始 Word 文件：" + original,
                "sourceNotes": "由后台导入，请在发布前校对正文、图片、专栏与阅读边界。",
                "outsideScope": "本文用于资料阅读，不作为诊断、处方或自行操作指引。",
                "columnName": "青囊选读", "status": "draft"
            }
            self.audit(connection, session["user_id"], "import", "article", draft["id"], {"name": original, "bytes": length})
            connection.commit()
        return self.send_json(200, {"ok": True, "content": draft})

    def list_logs(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            rows = connection.execute("""SELECT l.action,l.entity_type,l.entity_id,l.detail_json,l.created_at,u.username
                                         FROM admin_audit_logs l LEFT JOIN admin_users u ON u.id=l.user_id
                                         ORDER BY l.created_at DESC LIMIT 100""").fetchall()
            return self.send_json(200, {"logs": [dict(row) for row in rows]})

    def export_data(self):
        with db() as connection:
            if not self.require_session(connection):
                return
            public_values = []
            export_page = 1
            while True:
                batch, total = public_contents(connection, True, page=export_page, page_size=60, include_body=True)
                public_values.extend(batch)
                if export_page * 60 >= total:
                    break
                export_page += 1
            payload = {"exportedAt": now_ms(), "contents": public_values,
                       "allContents": [json.loads(row[0]) for row in connection.execute("SELECT payload_json FROM admin_contents ORDER BY updated_at DESC")]}
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="xiaoqingnang-backup.json"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def save_upload(self, parsed):
        with db() as connection:
            session = self.require_session(connection, write=True)
            if not session:
                return
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].lower()
            if not (content_type.startswith("image/") or content_type.startswith("video/")):
                return self.send_json(415, {"error": "只支持图片或视频"})
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_UPLOAD:
                return self.send_json(413, {"error": "素材为空或超过120MB"})
            original = parse_qs(parsed.query).get("name", ["media"])[0]
            suffix = Path(original).suffix.lower()[:10]
            filename = uuid4().hex + suffix
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            target = UPLOAD_DIR / filename
            target.write_bytes(self.rfile.read(length))
            self.audit(connection, session["user_id"], "upload", "media", filename, {"contentType": content_type, "bytes": length})
            connection.commit()
        return self.send_json(200, {"ok": True, "url": "/media/" + filename})

    def serve_media(self, path):
        # CentOS 7 自带 Python 3.6，没有 str.removeprefix。
        name = Path(unquote(path[len("/media/"):])).name
        target = UPLOAD_DIR / name
        if not target.is_file():
            return self.send_json(404, {"error": "素材不存在"})
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_remote_image(self, query):
        """Serve legacy article images through this origin to avoid browser TLS/hotlink failures."""
        raw = (query.get("url") or [""])[0].strip()
        target_url = unquote(raw)
        parsed = urlparse(target_url)
        if parsed.scheme != "https" or parsed.netloc not in {"zengshiwuyu.cn", "zibingziyi.zengshiwuyu.cn"}:
            return self.send_json(400, {"error": "不支持的图片地址"})
        try:
            request = urllib.request.Request(target_url, headers={"User-Agent": "XiaoQingNang-ImageProxy/1.0", "Accept": "image/*"})
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(request, timeout=20, context=context) as response:
                body = response.read(MAX_UPLOAD)
                content_type = response.headers.get("Content-Type", "image/jpeg").split(";", 1)[0]
        except Exception:
            return self.send_json(502, {"error": "原图暂时无法读取"})
        if not content_type.startswith("image/"):
            return self.send_json(415, {"error": "原地址不是图片"})
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "public, max-age=86400")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_web(self, path):
        """在同一端口提供 HBuilderX 的 Web 正式产物。"""
        if not WEB_DIR.is_dir():
            return self.send_json(503, {"error": "Web 产物尚未生成，请先在 HBuilderX 发行到 Web"})
        relative = unquote(path).lstrip("/") or "index.html"
        target = (WEB_DIR / relative).resolve()
        try:
            target.relative_to(WEB_DIR.resolve())
        except ValueError:
            return self.send_json(404, {"error": "资源不存在"})
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            target = WEB_DIR / "index.html"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload, cookie=None, cookie_max_age=SESSION_SECONDS):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        if cookie is not None:
            self.set_session_cookie(cookie, cookie_max_age)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    initialize()
    os.chdir(ROOT)
    port = int(os.environ.get("XQN_PORT", "4173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"小青囊 H5：http://127.0.0.1:{port}/（后台：/admin/）")
    server.serve_forever()
