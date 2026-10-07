"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import FrontBottomNav from "@/src/components/FrontBottomNav";

type Article = {
  id: string;
  title: string;
  summary?: string;
  columnName?: string;
  coverImage?: string;
  publishedAt?: number;
  sourceAuthor?: string;
  readingMinutes?: number;
};
type Column = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  count?: number;
};

export default function AnthologyPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [query, setQuery] = useState("");
  const [activeColumn, setActiveColumn] = useState("");
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchPage = useCallback(async (nextPage: number, append: boolean) => {
    const response = await fetch(
      `/api/published-content?page=${nextPage}&pageSize=24&type=article`,
    );
    if (!response.ok) throw new Error("文集加载失败");
    const data = await response.json();
    setArticles((current) =>
      append ? [...current, ...(data.contents || [])] : data.contents || [],
    );
    setColumns(data.columns || []);
    setPage(nextPage);
    setHasMore(Boolean(data.hasMore));
  }, []);
  useEffect(() => {
    const refresh = async () => {
      try {
        setLoading(true);
        await fetchPage(1, false);
      } catch {
        setArticles([]);
        setColumns([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchPage]);
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || query.trim()) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, page, query]);
  useEffect(() => {
    const scroll = document.querySelector<HTMLElement>(
      ".front-anthology-page .front-reading-scroll",
    );
    if (!scroll) return;
    const onScroll = () => {
      if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 500)
        void loadMore();
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => scroll.removeEventListener("scroll", onScroll);
  }, [loadMore]);
  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setSearchResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      (async () => {
        const matches: Article[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 20) {
          const response = await fetch(
            `/api/published-content?page=${page}&pageSize=500&type=article&q=${encodeURIComponent(text)}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("搜索失败");
          const data = await response.json();
          matches.push(...(data.contents || []));
          hasMore = Boolean(data.hasMore);
          page += 1;
        }
        setSearchResults(matches);
      })().catch((error) => {
        if (error?.name !== "AbortError") setSearchResults([]);
      });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const source = searchResults ?? articles;
    return source.filter((article) => {
      const columnMatch =
        !activeColumn ||
        article.columnName ===
          columns.find((column) => column.id === activeColumn)?.name;
      const textMatch =
        searchResults !== null ||
        !text ||
        [article.title, article.summary, article.columnName]
          .join(" ")
          .toLowerCase()
          .includes(text);
      return columnMatch && textMatch;
    });
  }, [articles, columns, activeColumn, query, searchResults]);
  const today = useMemo(() => {
    const key = new Date().toDateString();
    return articles.filter(
      (article) =>
        article.publishedAt &&
        new Date(article.publishedAt).toDateString() === key,
    );
  }, [articles]);
  return (
    <main className="front-page front-anthology-page">
      <div className="front-anthology-titlebar">青囊文集</div>
      <div className="front-reading-scroll">
        <header className="front-masthead">
          <div className="front-masthead-title">
            <span>小青囊</span>
            <b>｜</b>
            <strong>青囊文集</strong>
          </div>
          <label className="front-search-box">
            <span className="front-search-mark" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索文章标题或正文内容"
            />
          </label>
        </header>
        {today.length > 0 && (
          <section className="front-section front-today-section">
            <div className="front-section-heading">
              <div>
                <span>今日更新</span>
                <strong>今天新来的文章</strong>
              </div>
              <small>{today.length} 篇</small>
            </div>
            <div className="front-today-list">
              {today.map((article) => (
                <Link
                  href={`/article/${article.id}`}
                  key={article.id}
                  className="front-today-card"
                >
                  <ArticleCover article={article} compact />
                  <div className="front-today-copy">
                    <span>{article.columnName || "青囊选读"}</span>
                    <strong className="front-article-title">
                      {article.title}
                    </strong>
                    <small>{article.summary || "打开查看全文"}</small>
                  </div>
                  <b>›</b>
                </Link>
              ))}
            </div>
          </section>
        )}
        {columns.length > 0 && (
          <section className="front-section">
            <div className="front-section-heading">
              <div>
                <span>专栏</span>
                <strong>循着一条线读下去</strong>
              </div>
              <small>{columns.length} 个专栏</small>
            </div>
            <div className="front-column-scroll">
              <div className="front-column-row">
                <button
                  className={`front-column-card all ${!activeColumn ? "selected" : ""}`}
                  onClick={() => setActiveColumn("")}
                >
                  <small>{articles.length} 篇</small>
                  <strong>全部文章</strong>
                  <span>在全部文章中查找</span>
                </button>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    className={`front-column-card ${activeColumn === column.id ? "selected" : ""}`}
                    style={{ background: column.color || "#E8EEE9" }}
                    onClick={() =>
                      setActiveColumn(
                        activeColumn === column.id ? "" : column.id,
                      )
                    }
                  >
                    <small>
                      {column.count ??
                        articles.filter(
                          (article) => article.columnName === column.name,
                        ).length}{" "}
                      篇
                    </small>
                    <strong>{column.name}</strong>
                    <span>
                      {column.description || "来自已审核内容的文章。"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
        <section className="front-section front-article-section">
          <div className="front-section-heading">
            <div>
              <span>{query.trim() ? "搜索结果" : "全部文章"}</span>
              <strong>
                {activeColumn
                  ? columns.find((column) => column.id === activeColumn)?.name
                  : "全部文章"}
              </strong>
            </div>
          </div>
          {loading ? (
            <div className="front-empty">
              <span>正在加载文集…</span>
            </div>
          ) : (
            <div className="front-article-list">
              {visible.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="front-article-card"
                  onClick={() => {
                    window.localStorage.setItem(
                      "xqn_anthology_last_read",
                      article.id,
                    );
                  }}
                >
                  <ArticleCover article={article} />
                  <div className="front-article-body">
                    <span>{article.columnName || "青囊选读"}</span>
                    <strong>{article.title}</strong>
                    <p>{article.summary || "打开查看全文"}</p>
                    <small>
                      {article.sourceAuthor || "罾事物语"} · 约{" "}
                      {article.readingMinutes || 1} 分钟 <b>阅读 ›</b>
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div className="front-empty">
              <strong>这里还没有文章</strong>
              <span>
                {query.trim() ? "换一个关键词试试" : "文章发布后会出现在这里。"}
              </span>
            </div>
          )}
          {!query.trim() && loadingMore && (
            <div className="front-loading-more">正在加载更多文章…</div>
          )}
          {!query.trim() && !loadingMore && !hasMore && articles.length > 0 && (
            <div className="front-loading-more">已经到底了</div>
          )}
        </section>
      </div>
      <FrontBottomNav active="anthology" />
    </main>
  );
}

function ArticleCover({
  article,
  compact = false,
}: {
  article: Article;
  compact?: boolean;
}) {
  const imageSrc = article.coverImage?.startsWith("https://zibingziyi.zengshiwuyu.cn/")
    ? `/api/image-proxy?url=${encodeURIComponent(article.coverImage)}`
    : article.coverImage;
  if (imageSrc)
    return (
      <img
        className={compact ? "front-today-cover" : "front-card-cover"}
        src={imageSrc}
        alt=""
      />
    );
  return (
    <div
      className={
        compact
          ? "front-today-cover front-cover-placeholder"
          : "front-card-cover front-cover-placeholder"
      }
    >
      <span>青囊文集</span>
      <strong>{article.columnName || "青囊选读"}</strong>
    </div>
  );
}
