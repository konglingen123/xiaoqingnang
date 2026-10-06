"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [content, setContent] = useState<any>(null),
    [error, setError] = useState(""),
    [size, setSize] = useState<"small" | "medium" | "large">("medium"),
    [saved, setSaved] = useState(false),
    [note, setNote] = useState(""),
    [noteOpen, setNoteOpen] = useState(false),
    [tab, setTab] = useState("content"),
    [neighbors, setNeighbors] = useState<{
      previous?: { id: string; title: string };
      next?: { id: string; title: string };
    }>({}),
    [sourceOpen, setSourceOpen] = useState(false);
  useEffect(() => {
    const storedSize = localStorage.getItem("xqn-reading-size");
    if (
      storedSize === "small" ||
      storedSize === "medium" ||
      storedSize === "large"
    )
      setSize(storedSize);
    params
      .then(({ id }) => {
        localStorage.setItem("xqn_anthology_last_read", id);
        const ids = JSON.parse(
          localStorage.getItem("xqn_reading_favorites") || "[]",
        );
        const legacyKey = `xqn-reading-${id}`;
        const legacySaved = localStorage.getItem(`${legacyKey}-saved`) === "1";
        if (legacySaved && !ids.includes(id)) {
          ids.unshift(id);
          localStorage.setItem("xqn_reading_favorites", JSON.stringify(ids));
        }
        setSaved(ids.includes(id));
        const notes = JSON.parse(
          localStorage.getItem("xqn_reading_notes") || "[]",
        );
        const legacyNote = localStorage.getItem(`${legacyKey}-note`) || "";
        if (legacyNote && !notes.some((x: any) => x.contentId === id)) {
          notes.unshift({
            contentId: id,
            text: legacyNote,
            updatedAt: Date.now(),
          });
          localStorage.setItem("xqn_reading_notes", JSON.stringify(notes));
        }
        setNote(notes.find((x: any) => x.contentId === id)?.text || legacyNote);
        (async () => {
          const list: any[] = [];
          let page = 1,
            hasMore = true;
          while (hasMore && page <= 20) {
            const response = await fetch(
              `/api/published-content?page=${page}&pageSize=500&type=article`,
            );
            const data = await response.json();
            list.push(...(data.contents || []));
            hasMore = Boolean(data.hasMore);
            page += 1;
          }
          {
            const index = list.findIndex((item: any) => item.id === id);
            setNeighbors({
              previous: index > 0 ? list[index - 1] : undefined,
              next:
                index >= 0 && index < list.length - 1
                  ? list[index + 1]
                  : undefined,
            });
          }
        })().catch(() => {});
        return fetch(`/api/published-content/${encodeURIComponent(id)}`);
      })
      .then((r) => (r?.ok ? r.json() : Promise.reject(new Error("文章不存在"))))
      .then((d) => setContent(d.content))
      .catch((e) => setError(e.message));
  }, [params]);
  if (error)
    return (
      <main className="xqn-shell">
        <div className="reader">
          <Link className="pill" href="/anthology">
            ← 返回文集
          </Link>
          <div className="empty">{error}</div>
        </div>
      </main>
    );
  if (!content)
    return (
      <main className="xqn-shell">
        <div className="reader">
          <div className="empty">正在打开文章…</div>
        </div>
      </main>
    );
  const key = `xqn-reading-${content.id}`;
  function changeSize(value: "small" | "medium" | "large") {
    setSize(value);
    localStorage.setItem("xqn-reading-size", value);
  }
  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    const ids = JSON.parse(
      localStorage.getItem("xqn_reading_favorites") || "[]",
    ).filter((id: string) => id !== content.id);
    if (next) ids.unshift(content.id);
    localStorage.setItem("xqn_reading_favorites", JSON.stringify(ids));
    localStorage.setItem(
      "xqn_reading_titles",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("xqn_reading_titles") || "{}"),
        [content.id]: content.title,
      }),
    );
  }
  function saveNote() {
    const notes = JSON.parse(
      localStorage.getItem("xqn_reading_notes") || "[]",
    ).filter((x: any) => x.contentId !== content.id);
    if (note.trim())
      notes.unshift({
        contentId: content.id,
        text: note.trim(),
        updatedAt: Date.now(),
        title: content.title,
      });
    localStorage.setItem("xqn_reading_notes", JSON.stringify(notes));
    setNoteOpen(false);
  }
  return (
    <main className="xqn-shell reader-shell">
      <article className={`reader reader-${size}`}>
        <header className="reader-head">
          <div className="reader-topbar">
            <Link className="reader-back" href="/anthology">
              ‹
            </Link>
            <strong>{content.title}</strong>
            <span>···</span>
          </div>
          <div className="reader-head-content">
            <div className="reader-tags">
              <span>{content.columnName || "青囊文集"}</span>
              <span>免费</span>
            </div>
            <h1>{content.title}</h1>
            <p className="reader-summary">
              {content.summary || "打开查看全文"}
            </p>
            <div className="reader-meta">
              {content.sourceAuthor || content.sourcePlatform || "罾事物语"} ·
              约 {content.readingMinutes || 1} 分钟
            </div>
            <div className="reader-actions">
              <button onClick={toggleSaved}>
                {saved ? "✓ 已收藏" : "☆ 收藏"}
              </button>
              <button onClick={() => setNoteOpen(true)}>
                ▱ {note ? "查看笔记" : "写笔记"}
              </button>
              <span>字号</span>
              {(["small", "medium", "large"] as const).map((v) => (
                <button
                  key={v}
                  className={size === v ? "active" : ""}
                  onClick={() => changeSize(v)}
                >
                  {v === "small" ? "小" : v === "medium" ? "舒适" : "大"}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="reader-scroll">
          {content.type === "article" && (
            <div className="article-notice">
              本文用于资料阅读，文中经验不自动成为可自行尝试的养护方法。
            </div>
          )}
          {content.type !== "article" && (
            <div className="reader-tabs">
              {[
                ["content", "内容"],
                ["scope", "使用范围"],
                ["notice", "注意事项"],
                ["risk", "风险边界"],
                ["cases", "案例集"],
              ]
                .filter(
                  ([key]) =>
                    key === "content" ||
                    (key === "scope" && content.usageScope?.length) ||
                    (key === "notice" && content.notices?.length) ||
                    (key === "risk" &&
                      (content.outsideScope?.length ||
                        content.helpConditions?.length)) ||
                    (key === "cases" && content.casesHtml),
                )
                .map(([key, label]) => (
                  <button
                    key={key}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
            </div>
          )}
          <div className={`reader-body reader-panel-${tab}`}>
            {tab === "content" && (
              <div
                dangerouslySetInnerHTML={{
                  __html: content.contentHtml || "<p>暂无正文。</p>",
                }}
              />
            )}
            {tab === "scope" && <List values={content.usageScope} />}{" "}
            {tab === "notice" && <List values={content.notices} />}{" "}
            {tab === "risk" && (
              <>
                <h3>不适合自行尝试</h3>
                <List values={content.outsideScope} />
                <h3>出现这些情况请停止并寻求专业帮助</h3>
                <List values={content.helpConditions} />
              </>
            )}{" "}
            {tab === "cases" && (
              <div
                dangerouslySetInnerHTML={{
                  __html: content.casesHtml || "<p>暂无案例。</p>",
                }}
              />
            )}
          </div>
          <div className="notice">
            本文仅用于健康信息参考，不替代专业检查和建议。如有明显不适或持续加重，请及时寻求专业帮助。
          </div>
          {(neighbors.previous || neighbors.next) && (
            <div className="article-neighbors">
              <Link
                href={
                  neighbors.previous ? `/article/${neighbors.previous.id}` : "#"
                }
                className={!neighbors.previous ? "disabled" : ""}
              >
                <small>上一篇</small>
                <strong>{neighbors.previous?.title || "已经是第一篇"}</strong>
              </Link>
              <Link
                href={neighbors.next ? `/article/${neighbors.next.id}` : "#"}
                className={`next ${!neighbors.next ? "disabled" : ""}`}
              >
                <small>下一篇</small>
                <strong>{neighbors.next?.title || "已经是最后一篇"}</strong>
              </Link>
            </div>
          )}
          {content.source?.title && (
            <button
              className="reader-source-link"
              onClick={() => setSourceOpen(true)}
            >
              <b>来源</b>
              <span>
                <strong>{content.source.title}</strong>
                <small>已核验 · 在当前页查看</small>
              </span>
              <i>⌃</i>
            </button>
          )}
        </div>
        <footer className="reader-footer">
          <Link href="/anthology">← 文集</Link>
          {neighbors.next ? (
            <Link href={`/article/${neighbors.next.id}`}>下一篇 →</Link>
          ) : (
            <span>已经是最后一篇</span>
          )}
        </footer>
        {sourceOpen && (
          <div className="source-overlay" onClick={() => setSourceOpen(false)}>
            <div
              className="source-dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <strong>来源</strong>
                <button onClick={() => setSourceOpen(false)}>×</button>
              </header>
              <h3>{content.source.title}</h3>
              {content.source.author && <p>作者：{content.source.author}</p>}
              {content.source.platform && (
                <p>平台：{content.source.platform}</p>
              )}
              {content.source.originalText && (
                <blockquote>{content.source.originalText}</blockquote>
              )}
            </div>
          </div>
        )}
        {noteOpen && (
          <div className="note-overlay">
            <div className="note-dialog">
              <h2>我的笔记</h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记下值得回看的内容…"
              />
              <div>
                <button onClick={() => setNoteOpen(false)}>取消</button>
                <button onClick={saveNote}>保存笔记</button>
              </div>
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
function List({ values }: { values?: string[] }) {
  return (
    <div className="reader-list">
      {(values || []).map((value: string) => (
        <div key={value}>• {value}</div>
      ))}
    </div>
  );
}
