#!/usr/bin/env python3
"""向本地库加入可反复执行的三库关联演示数据。

所有内容均标注为演示占位，保持草稿，不得作为真实养护资料发布。
"""

from pathlib import Path
import json
import sqlite3
import time


ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / ".runtime" / "content.db"
SCHEMA = ROOT / "database" / "schema.sql"


def encoded(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    now = int(time.time() * 1000)
    connection = sqlite3.connect(str(DATABASE))
    connection.execute("PRAGMA foreign_keys=ON")
    connection.executescript(SCHEMA.read_text(encoding="utf-8"))

    problems = [
        {
            "id": "PRB-DEMO-FOREARM", "name": "演示｜前臂日常不适",
            "aliases": ["前臂发紧", "小臂不舒服"],
            "description": "【演示占位】只用于检查问题与方法的关联交互。",
            "bodyAreaIds": ["forearm"], "notes": "演示数据，待删除或替换为真实审核内容。"
        },
        {
            "id": "PRB-DEMO-ELBOW", "name": "演示｜肘部日常不适",
            "aliases": ["肘部发紧", "肘窝不舒服"],
            "description": "【演示占位】只用于检查一个方法关联多个问题。",
            "bodyAreaIds": ["elbow"], "notes": "演示数据，待删除或替换为真实审核内容。"
        }
    ]
    for problem in problems:
        problem.update(status="draft", updatedAt=now, version=1)
        connection.execute(
            """INSERT OR IGNORE INTO admin_problems
               (id,name,status,payload_json,created_at,updated_at,version) VALUES(?,?,'draft',?,?,?,1)""",
            (problem["id"], problem["name"], encoded(problem), now, now)
        )

    points = [
        {
            "id": "PNT-DEMO-KONGZUI", "name": "演示｜孔最", "aliases": [], "bodyAreaId": "forearm",
            "professionalLocation": "【演示占位】正式专业定位待专业人员根据权威标准补录。",
            "everydayLocation": "【演示占位】正式经验取穴方法待补录。",
            "contentHtml": "<p><strong>演示定位卡片</strong></p><p>此处将来放定位图和经验取穴图。</p>",
            "commonMistakes": "【演示占位】待专业审核。", "notices": "演示数据，不用于实际定位。",
            "sourceTitle": "后台三库关联演示", "sourceText": "此为功能演示占位数据，不是真实穴位依据。", "sourceNotes": "不得发布。"
        },
        {
            "id": "PNT-DEMO-CHIZE", "name": "演示｜尺泽", "aliases": [], "bodyAreaId": "elbow",
            "professionalLocation": "【演示占位】正式专业定位待专业人员根据权威标准补录。",
            "everydayLocation": "【演示占位】正式经验取穴方法待补录。",
            "contentHtml": "<p><strong>演示定位卡片</strong></p><p>此处将来放定位图和经验取穴图。</p>",
            "commonMistakes": "【演示占位】待专业审核。", "notices": "演示数据，不用于实际定位。",
            "sourceTitle": "后台三库关联演示", "sourceText": "此为功能演示占位数据，不是真实穴位依据。", "sourceNotes": "不得发布。"
        }
    ]
    for point in points:
        point.update(status="draft", updatedAt=now, version=1)
        connection.execute(
            """INSERT OR IGNORE INTO admin_points
               (id,name,body_area_id,status,payload_json,created_at,updated_at,version)
               VALUES(?,?,?,'draft',?,?,?,1)""",
            (point["id"], point["name"], point["bodyAreaId"], encoded(point), now, now)
        )

    content = {
        "id": "CNT-DEMO-KONGZUI-CHIZE", "type": "skill",
        "title": "演示｜孔最＋尺泽组合方法", "summary": "检查一个方法如何调用两个穴位和多个问题。",
        "keywords": "演示，组合方法", "bodyAreaIds": ["forearm", "elbow"],
        "methodName": "演示｜孔最＋尺泽", "methodType": "acupoint", "materials": "无",
        "contentHtml": "<h3>组合逻辑演示</h3><p>这里只保存整体操作顺序；孔最和尺泽的定位信息由穴位库自动调用。</p>",
        "usageScope": "仅用于检查后台交互", "notices": "不得作为正式内容使用",
        "outsideScope": "不用于实际操作", "helpConditions": "请勿依据这条演示数据进行操作",
        "casesHtml": "", "sourceTitle": "后台三库关联演示",
        "sourceAuthor": "", "sourcePlatform": "小青囊本地测试", "sourceUrl": "",
        "sourceText": "此为产品交互演示数据，不来自正式养护资料。", "sourceNotes": "不得发布。",
        "status": "draft", "updatedAt": now, "version": 1
    }
    connection.execute(
        """INSERT OR IGNORE INTO admin_contents
           (id,title,method_name,status,payload_json,created_at,updated_at,version)
           VALUES(?,?,?,'draft',?,?,?,1)""",
        (content["id"], content["title"], content["methodName"], encoded(content), now, now)
    )
    connection.execute("DELETE FROM content_point_links WHERE content_id=?", (content["id"],))
    connection.executemany(
        "INSERT INTO content_point_links(content_id,point_id,sort_order,instruction) VALUES(?,?,?,?)",
        [
            (content["id"], "PNT-DEMO-CHIZE", 0, "第1个调用位置；本方法的动作参数待人工填写。"),
            (content["id"], "PNT-DEMO-KONGZUI", 1, "第2个调用位置；本方法的动作参数待人工填写。")
        ]
    )
    connection.execute("DELETE FROM problem_content_links WHERE content_id=?", (content["id"],))
    connection.executemany(
        "INSERT INTO problem_content_links(problem_id,content_id,evidence_type,evidence_text,sort_order) VALUES(?,?,?,?,?)",
        [
            ("PRB-DEMO-FOREARM", content["id"], "pending", "演示关联，无正式原文依据。", 0),
            ("PRB-DEMO-ELBOW", content["id"], "pending", "演示关联，无正式原文依据。", 1)
        ]
    )
    connection.commit()
    connection.close()
    print("已加入：2 个问题、2 个穴位、1 个组合方法（全部为演示草稿）")


if __name__ == "__main__":
    main()
