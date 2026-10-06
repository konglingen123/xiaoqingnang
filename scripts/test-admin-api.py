#!/usr/bin/env python3
"""在临时数据库中验证本地后台的完整发布链，不接触真实内容。"""

from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
import importlib.util
import json


ROOT = Path(__file__).resolve().parents[1]


def load_server():
    spec = importlib.util.spec_from_file_location("xqn_dev_server", ROOT / "scripts" / "dev-server.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def request(opener, base, path, method="GET", payload=None, csrf=""):
    body = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"} if body else {}
    if csrf:
        headers["X-CSRF-Token"] = csrf
    req = Request(base + path, data=body, headers=headers, method=method)
    try:
        response = opener.open(req, timeout=3)
        return response.status, json.loads(response.read().decode())
    except HTTPError as error:
        return error.code, json.loads(error.read().decode())


def complete_content():
    return {
        "id": "CNT-INTEGRATION-TEST", "type": "skill", "title": "接口测试问题",
        "summary": "", "keywords": "", "methodName": "接口测试方法",
        "methodType": "acupoint", "materials": "无",
        "bodyAreaIds": ["lower-back"],
        "contentHtml": "<h3>测试小标题</h3><p><strong>测试</strong>方法正文</p>",
        "usageScope": "测试范围", "notices": "", "outsideScope": "测试不适用情况",
        "helpConditions": "测试停止条件",
        "casesHtml": "<h3>案例一</h3><p>个体记录</p><script>alert(1)</script>",
        "sourceTitle": "测试来源",
        "sourceText": "测试原文依据"
    }


def main():
    module = load_server()
    cleaned, removed, flags = module.clean_imported_article_html(
        '<p>保留的文章正文。</p><p>长按二维码购买课程</p><img src="/promo.png"><p>继续保留。</p>'
    )
    assert "保留的文章正文" in cleaned and "继续保留" in cleaned
    assert "购买课程" not in cleaned and removed
    assert "推广附近图片需人工确认" in flags
    article_without_hint = {"id": "ARTICLE-HINT-TEST", "type": "article", "title": "阅读资料",
                            "contentHtml": "<p>阅读正文</p>", "sourceTitle": "原始资料", "sourceText": "原文依据"}
    assert not module.validate_content(article_without_hint), "文章阅读提示应为可选"
    method_without_boundary = complete_content()
    method_without_boundary["outsideScope"] = ""
    assert "outsideScope" in module.validate_content(method_without_boundary), "方法仍必须填写风险边界"
    with TemporaryDirectory(prefix="xqn-admin-test-") as directory:
        module.DATABASE_FILE = Path(directory) / "test.db"
        module.UPLOAD_DIR = Path(directory) / "uploads"
        module.initialize()
        server = ThreadingHTTPServer(("127.0.0.1", 0), module.Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        opener = build_opener(HTTPCookieProcessor(CookieJar()))
        try:
            status, setup = request(opener, base, "/api/admin/setup", "POST", {"username": "tester", "password": "TestPassword-2026"})
            assert status == 201, (status, setup)
            csrf = setup["csrfToken"]
            column = {"id": "COL-DELETE-TEST", "name": "测试删除专栏"}
            status, _ = request(opener, base, "/api/admin/columns", "POST", {"column": column}, csrf)
            assert status == 200
            article = {"id": "CNT-COLUMN-TEST", "type": "article", "title": "保留的文章",
                       "columnId": column["id"], "columnName": column["name"], "contentHtml": "<p>测试正文</p>"}
            status, _ = request(opener, base, "/api/admin/contents", "POST", {"content": article}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/columns/COL-DELETE-TEST/delete", "POST", {})
            assert status == 403
            status, deleted = request(opener, base, "/api/admin/columns/COL-DELETE-TEST/delete", "POST", {}, csrf)
            assert status == 200 and deleted["detachedArticles"] == 1
            status, records = request(opener, base, "/api/admin/contents")
            retained = next(item for item in records["contents"] if item["id"] == article["id"])
            assert retained["columnName"] == "" and retained["contentHtml"] == ""
            status, retained_detail = request(opener, base, "/api/admin/contents/CNT-COLUMN-TEST")
            assert status == 200 and retained_detail["content"]["contentHtml"] == article["contentHtml"]
            status, columns = request(opener, base, "/api/admin/columns")
            assert not columns["columns"], "删除最后一个专栏后不应自动重新创建"
            status, _ = request(opener, base, "/api/admin/columns/COL-DELETE-TEST/delete", "POST", {}, csrf)
            assert status == 404
            status, _ = request(build_opener(), base, "/api/admin/contents")
            assert status == 401
            status, _ = request(build_opener(), base, "/.runtime/content.db")
            assert status == 404

            def fake_source(url):
                if url.endswith("/articles?page=1&pageSize=50"):
                    return {"data": [{"id": 7}], "pagination": {"totalPages": 1}}
                if url.endswith("/articles/7"):
                    return {"data": {
                        "id": 7, "title": "外部来源测试文章", "summary": "摘要",
                        "content": '<p>需要保留的正文</p><p>长按二维码购买课程</p><img src="https://example.test/code.png">',
                        "cover": "", "category_name": "来源测试", "updated_at": "2026-09-21",
                        "url": "https://example.test/article/7"
                    }}
                raise AssertionError(url)

            module.fetch_json = fake_source
            status, scanned = request(opener, base, "/api/admin/article-sources/zibingziyi/scan", "POST", {}, csrf)
            assert status == 200 and scanned["received"] == 1 and scanned["candidates"] == 1
            status, source_status = request(opener, base, "/api/admin/article-sources")
            assert status == 200 and source_status["candidates"] == 1
            status, synced = request(opener, base, "/api/admin/article-sources/zibingziyi/sync", "POST", {}, csrf)
            assert status == 200 and synced["created"] == 1 and synced["flagged"] == 1
            status, synced_again = request(opener, base, "/api/admin/article-sources/zibingziyi/sync", "POST", {}, csrf)
            assert status == 200 and synced_again["unchanged"] == 1 and synced_again["created"] == 0
            status, records = request(opener, base, "/api/admin/contents")
            imports = [item for item in records["contents"] if item.get("sourceKind") == "zibingziyi"]
            assert len(imports) == 1 and imports[0]["status"] == "draft"
            assert "需要保留的正文" in imports[0]["contentHtml"] and "购买课程" not in imports[0]["contentHtml"]
            assert imports[0]["reviewStatus"] == "needs_review" and imports[0]["removedPromotions"]
            status, rejected = request(opener, base, "/api/admin/contents/ZBYZ-7/publish", "POST", {}, csrf)
            assert status == 422 and "sourceReview" in rejected["missing"]

            problem = {
                "id": "PRB-TEST", "name": "测试问题", "aliases": ["口语说法"],
                "description": "只用于接口测试", "bodyAreaIds": ["forearm"], "notes": ""
            }
            status, _ = request(opener, base, "/api/admin/problems", "POST", {"problem": problem}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/problems/PRB-TEST/verify", "POST", {}, csrf)
            assert status == 200

            point = {
                "id": "PNT-TEST", "name": "测试穴位", "aliases": [], "bodyAreaId": "forearm",
                "professionalLocation": "测试专业定位", "everydayLocation": "测试经验定位",
                "contentHtml": "<p>测试定位图文</p>", "commonMistakes": "", "notices": "",
                "sourceTitle": "测试定位来源", "sourceText": "测试定位依据", "sourceNotes": ""
            }
            status, _ = request(opener, base, "/api/admin/points", "POST", {"point": point}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/points/PNT-TEST/verify", "POST", {}, csrf)
            assert status == 200

            incomplete = complete_content()
            incomplete["contentHtml"] = "<p><br></p>"
            status, _ = request(opener, base, "/api/admin/contents", "POST", {"content": incomplete}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/contents/CNT-INTEGRATION-TEST/publish", "POST", {}, csrf)
            assert status == 422

            related_content = complete_content()
            related_content["pointLinks"] = [{"pointId": "PNT-TEST", "instruction": "测试方法中的特有操作"}]
            related_content["problemLinks"] = [{
                "problemId": "PRB-TEST", "evidenceType": "direct", "evidenceText": "测试直接依据"
            }]
            status, saved = request(opener, base, "/api/admin/contents", "POST", {"content": related_content}, csrf)
            assert status == 200 and saved["content"]["status"] == "ready"
            assert saved["content"]["pointLinks"][0]["point"]["name"] == "测试穴位"
            assert saved["content"]["problemLinks"][0]["problem"]["name"] == "测试问题"
            status, problem_result = request(opener, base, "/api/admin/problems")
            assert status == 200
            linked_problem = next(value for value in problem_result["problems"] if value["id"] == "PRB-TEST")
            assert linked_problem["methodLinks"][0]["contentId"] == "CNT-INTEGRATION-TEST"
            assert linked_problem["methodLinks"][0]["method"]["methodName"] == "接口测试方法"
            linked_problem["methodLinks"][0]["evidenceText"] = "从问题库修改的关联依据"
            status, _ = request(opener, base, "/api/admin/problems", "POST", {"problem": linked_problem}, csrf)
            assert status == 200
            status, content_result = request(opener, base, "/api/admin/contents")
            refreshed_content = next(value for value in content_result["contents"] if value["id"] == "CNT-INTEGRATION-TEST")
            assert refreshed_content["problemLinks"][0]["evidenceText"] == "从问题库修改的关联依据"
            status, _ = request(opener, base, "/api/admin/problems/PRB-TEST/verify", "POST", {}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/contents/CNT-INTEGRATION-TEST/publish", "POST", {}, csrf)
            assert status == 200
            status, public = request(opener, base, "/api/published-content")
            assert status == 200 and len(public["contents"]) == 1
            assert "个体记录" in public["contents"][0]["casesHtml"]
            assert "script" not in public["contents"][0]["casesHtml"]
            assert public["contents"][0]["pointLinks"][0]["point"]["id"] == "PNT-TEST"
            assert public["contents"][0]["problemLinks"][0]["problem"]["id"] == "PRB-TEST"

            article = complete_content()
            article.update({"id": "CNT-ARTICLE-TEST", "type": "article", "title": "测试信息资料"})
            for key in ("methodName", "methodType", "materials", "usageScope", "helpConditions"):
                article.pop(key, None)
            status, _ = request(opener, base, "/api/admin/contents", "POST", {"content": article}, csrf)
            assert status == 200
            status, _ = request(opener, base, "/api/admin/contents/CNT-ARTICLE-TEST/publish", "POST", {}, csrf)
            assert status == 200
            status, public = request(opener, base, "/api/published-content")
            assert any(value["type"] == "article" for value in public["contents"])
            status, _ = request(opener, base, "/api/admin/contents/CNT-ARTICLE-TEST/withdraw", "POST", {}, csrf)
            assert status == 200

            edited = complete_content()
            edited["summary"] = "发布后的测试修改"
            status, saved = request(opener, base, "/api/admin/contents", "POST", {"content": edited}, csrf)
            assert status == 200 and saved["content"]["status"] == "ready"
            status, public = request(opener, base, "/api/published-content")
            assert status == 200 and public["contents"] == []

            request(opener, base, "/api/admin/contents/CNT-INTEGRATION-TEST/publish", "POST", {}, csrf)
            status, _ = request(opener, base, "/api/admin/contents/CNT-INTEGRATION-TEST/withdraw", "POST", {}, csrf)
            assert status == 200
            status, public = request(opener, base, "/api/published-content")
            assert status == 200 and public["contents"] == []
            status, logs = request(opener, base, "/api/admin/logs")
            assert status == 200 and len(logs["logs"]) >= 6
            print("✅ 后台接口全链路测试通过")
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
