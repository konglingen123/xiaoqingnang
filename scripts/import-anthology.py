#!/usr/bin/env python3
"""将罾事物语 DOCX 批量导入小青囊文集。原文件只读，可重复执行。"""

from argparse import ArgumentParser
from datetime import datetime
from hashlib import sha256
from html import escape
from pathlib import Path
import json
import re
import shutil
import sqlite3
import time
import zipfile
import xml.etree.ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"w": W, "r": R, "a": A, "pr": PR}

COLUMNS = [
    "穴道的奥秘", "积沙成塔学中医", "医路串珠", "跟傻大爷学针灸", "自病自医",
    "宋永正医案", "周末分享", "有熊灸", "宸熙日记", "阿文直播", "网友分享",
    "和气术", "易安", "宣宾技法"
]
TOPIC_WORDS = [
    "睡眠", "失眠", "饮食", "节气", "艾灸", "针灸", "穴位", "经络", "女性", "儿童",
    "情绪", "头痛", "腰背", "膝", "腹部", "肠道", "皮肤", "医案", "家庭", "养生"
]
HIGH_RISK = ["刺血", "放血", "针刺", "扎针", "处方", "方剂", "癌", "肿瘤", "急救", "婴儿", "孕妇", "治愈", "根治"]
MEDIUM_RISK = ["艾灸", "拔罐", "刮痧", "药", "疾病", "患者", "治疗", "调理"]
HEADING_WORDS = ("操作方法", "要点", "注意", "案例", "取穴", "小贴士", "编者按", "方法", "应用", "原文")


def normalize_title(value):
    return re.sub(r"[\s｜|：:·—\-（）()《》“”‘’]+", "", value).lower()


def file_title(path):
    return re.sub(r"^\d{4}-\d{2}-\d{2}_", "", path.stem).strip()


def column_for(title):
    for name in COLUMNS:
        if title.startswith(name) or name in title[:28]:
            return name
    if title.startswith("「转」"):
        return "转载选读"
    return "青囊选读"


def topics_for(title, column):
    values = [word for word in TOPIC_WORDS if word in title]
    if "医案" in column and "医案" not in values:
        values.append("医案")
    if column in ("跟傻大爷学针灸", "穴道的奥秘", "积沙成塔学中医") and "经络" not in values:
        values.append("经络")
    return values[:4]


def risk_for(title, plain):
    sample = title + plain[:1600]
    if any(word in sample for word in HIGH_RISK):
        return "high"
    if any(word in sample for word in MEDIUM_RISK):
        return "review"
    return "general"


def paragraph_text(node):
    return "".join((t.text or "") for t in node.findall(".//w:t", NS)).replace("\xa0", " ").strip()


def extract_author(meta):
    match = re.search(r"原创(.+?)罾事物语20\d{2}", meta)
    if match:
        name = match.group(1).strip()
        return name if name and name != "罾事物语" else "罾事物语"
    return "罾事物语编辑部"


def is_heading(text, style):
    if style and ("Heading" in style or "标题" in style):
        return True
    return len(text) <= 22 and any(word in text for word in HEADING_WORDS) and not re.search(r"[。！？!?]$", text)


def extract_docx(path, upload_dir):
    with zipfile.ZipFile(str(path)) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        rels = {}
        try:
            rel_root = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
            rels = {rel.get("Id"): rel.get("Target") for rel in rel_root.findall("pr:Relationship", NS)}
        except KeyError:
            pass
        blocks, plain_parts, meta, stopped = [], [], "", False
        title = file_title(path)
        for paragraph in document.findall(".//w:body/w:p", NS):
            text = paragraph_text(paragraph)
            if not meta and text and ("罾事物语" in text or re.search(r"20\d{2}[-年]", text)):
                meta = text
            if text == title or (text and title.startswith(text) and len(text) > 12):
                text = ""
            if text and ("罾事物语" in text and re.search(r"20\d{2}", text)):
                text = ""
            if text.startswith(("声明：", "本公众号历史消息查阅方法", "关注健康，关注人生")):
                stopped = True
            if stopped:
                break
            if text and not text.startswith(("原分享截图", "相关内容，可点击", "长按二维码")):
                style_node = paragraph.find("./w:pPr/w:pStyle", NS)
                style = style_node.get("{%s}val" % W, "") if style_node is not None else ""
                tag = "h2" if is_heading(text, style) else "p"
                blocks.append("<{}>{}</{}>".format(tag, escape(text), tag))
                plain_parts.append(text)
            for blip in paragraph.findall(".//a:blip", NS):
                rel_id = blip.get("{%s}embed" % R)
                target = rels.get(rel_id, "")
                member = "word/" + target.lstrip("/") if target else ""
                if member not in archive.namelist():
                    continue
                data = archive.read(member)
                suffix = Path(target).suffix.lower() or ".png"
                filename = "anth-{}{}".format(sha256(data).hexdigest()[:20], suffix)
                destination = upload_dir / filename
                if not destination.exists():
                    destination.write_bytes(data)
                blocks.append('<img src="/media/{}" alt="{}配图">'.format(filename, escape(title)))
        return "".join(blocks), " ".join(plain_parts), extract_author(meta)


def summary_from(plain):
    text = re.sub(r"\s+", " ", plain).strip()
    return (text[:106] + "…") if len(text) > 108 else text


def main():
    parser = ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("project")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    source, project = Path(args.source), Path(args.project)
    db_path, upload_dir = project / ".runtime/content.db", project / ".runtime/uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(db_path))
    connection.executescript((project / "database/schema.sql").read_text(encoding="utf-8"))
    files = sorted(source.glob("*.docx"))
    seen_titles, imported, updated, archived, failed = {}, 0, 0, 0, []
    for row in connection.execute("SELECT id,payload_json FROM admin_contents WHERE status='published'"):
        try:
            existing = json.loads(row[1])
            if existing.get("type") == "article" and existing.get("title"):
                seen_titles.setdefault(normalize_title(existing["title"]), row[0])
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    now = int(time.time() * 1000)
    for path in files:
        try:
            title = file_title(path)
            date_match = re.match(r"(\d{4}-\d{2}-\d{2})_", path.name)
            published = int(datetime.strptime(date_match.group(1), "%Y-%m-%d").timestamp() * 1000) if date_match else now
            content_html, plain, author = extract_docx(path, upload_dir)
            if not content_html or len(plain) < 20:
                raise ValueError("没有提取到有效正文")
            key = normalize_title(title)
            content_id = "ANTH-" + sha256(path.name.encode("utf-8")).hexdigest()[:16].upper()
            duplicate_of = seen_titles.get(key)
            if duplicate_of == content_id:
                duplicate_of = None
            risk = risk_for(title, plain)
            column = column_for(title)
            boundary = "本文收录于青囊文集，用于保留和阅读作者观点及个体经验，不作为诊断、处方或自行操作指引。"
            if risk == "high":
                boundary += " 文中涉及侵入性操作、药物、严重疾病或强效果表述，未经专业复核请勿照做。"
            elif risk == "review":
                boundary += " 文中方法与效果陈述尚需独立审核，不能替代专业建议。"
            payload = {
                "id": content_id, "type": "article", "title": title, "summary": summary_from(plain),
                "keywords": topics_for(title, column), "bodyAreaIds": [],
                "contentHtml": content_html, "outsideScope": boundary, "helpConditions": "",
                "sourceTitle": title, "sourceAuthor": author, "sourcePlatform": "罾事物语",
                "sourceUrl": "", "sourceText": "原始 Word 文件：" + path.name,
                "sourceNotes": ["批量导入，原文只读保留", "发布前可在后台继续编辑校对"],
                "columnName": column, "columnId": sha256(column.encode("utf-8")).hexdigest()[:10],
                "issueNumber": None, "topics": topics_for(title, column), "coverImage": "", "editorNote": "",
                "originalPublishedAt": published, "reviewClass": risk,
                "duplicateOf": duplicate_of, "importSourceFile": path.name,
                "publishedAt": published, "reviewedAt": now, "version": 1
            }
            current = connection.execute("SELECT id FROM admin_contents WHERE id=?", (content_id,)).fetchone()
            if current and not args.replace:
                if not duplicate_of:
                    seen_titles[key] = content_id
                continue
            status = "archived" if duplicate_of else "published"
            if duplicate_of:
                archived += 1
            else:
                seen_titles[key] = content_id
            encoded = json.dumps(payload, ensure_ascii=False)
            if current:
                connection.execute("UPDATE admin_contents SET title=?,method_name='',status=?,payload_json=?,updated_at=?,published_at=?,version=version+1 WHERE id=?",
                                   (title, status, encoded, now, published if status == "published" else None, content_id))
                updated += 1
            else:
                connection.execute("INSERT INTO admin_contents(id,title,method_name,status,payload_json,created_at,updated_at,published_at,version) VALUES(?,?,?,?,?,?,?,?,1)",
                                   (content_id, title, "", status, encoded, now, now, published if status == "published" else None))
                imported += 1
        except Exception as error:
            failed.append({"file": path.name, "error": str(error)})
    connection.execute("INSERT INTO admin_audit_logs(user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(NULL,?,?,?,?,?)",
                       ("import", "anthology", "batch", json.dumps({"files": len(files), "imported": imported, "updated": updated, "archivedDuplicates": archived, "failed": len(failed)}, ensure_ascii=False), now))
    connection.commit()
    visible = 0
    for row in connection.execute("SELECT payload_json FROM admin_contents WHERE status='published'"):
        try:
            visible += json.loads(row[0]).get("type") == "article"
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    connection.close()
    print(json.dumps({"files": len(files), "imported": imported, "updated": updated, "archivedDuplicates": archived, "visibleArticles": visible, "failed": failed}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
