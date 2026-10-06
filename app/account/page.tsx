"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import FrontBottomNav from "@/src/components/FrontBottomNav";
type Saved = { id: string; title: string; note?: string };
type Item = { id: string; title: string };
const FAVORITES_KEY = "xqn_reading_favorites",
  NOTES_KEY = "xqn_reading_notes",
  TITLES_KEY = "xqn_reading_titles";
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export default function AccountPage() {
  const [logged, setLogged] = useState(false),
    [tab, setTab] = useState<"favorites" | "notes">("favorites"),
    [items, setItems] = useState<Saved[]>([]);
  function load() {
    fetch("/api/published-content?page=1&pageSize=200")
      .then((r) => r.json())
      .then((d) => {
        const all: Item[] = d.contents || [];
        const ids = readJson<string[]>(FAVORITES_KEY, []);
        const notes = readJson<
          Array<{ contentId: string; text: string; title?: string }>
        >(NOTES_KEY, []);
        const titles = readJson<Record<string, string>>(TITLES_KEY, {});
        const byId = new Map(all.map((item) => [item.id, item]));
        const titleFor = (id: string, title?: string) =>
          title || byId.get(id)?.title || titles[id] || "已收藏的资料";
        const legacy = all
          .map((item) => ({
            id: item.id,
            saved: localStorage.getItem(`xqn-reading-${item.id}-saved`) === "1",
            note: localStorage.getItem(`xqn-reading-${item.id}-note`) || "",
          }))
          .filter((item) => item.saved || item.note);
        for (const item of legacy) {
          if (item.saved && !ids.includes(item.id)) ids.push(item.id);
          if (item.note && !notes.some((note) => note.contentId === item.id))
            notes.push({
              contentId: item.id,
              text: item.note,
            });
        }
        if (legacy.length) {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
          localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
        }
        const fav = ids.map((id) => ({ id, title: titleFor(id) }));
        const note = notes
          .filter((x) => x?.contentId && x.text?.trim())
          .map((x) => ({
            id: x.contentId,
            title: titleFor(x.contentId, x.title),
            note: x.text,
          }));
        setItems([
          ...fav.map((x) => ({
            ...x,
            note: note.find((n) => n.id === x.id)?.note,
          })),
          ...note.filter((n) => !ids.includes(n.id)),
        ]);
      })
      .catch(() => setItems([]));
  }
  useEffect(() => {
    const refresh = () => {
      const user = readJson<{ openid?: string } | null>(
        "xqn_test_wechat_user",
        null,
      );
      setLogged(Boolean(user?.openid));
      load();
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  function login() {
    localStorage.setItem(
      "xqn_test_wechat_user",
      JSON.stringify({
        nickname: "微信用户",
        openid: `test_${Date.now()}`,
        loggedAt: Date.now(),
      }),
    );
    setLogged(true);
  }
  function logout() {
    localStorage.removeItem("xqn_test_wechat_user");
    setLogged(false);
  }
  const favoriteIds = readJson<string[]>(FAVORITES_KEY, []),
    noteItems = items.filter((item) => item.note),
    visible =
      tab === "favorites"
        ? items.filter((item) => favoriteIds.includes(item.id))
        : noteItems;
  return (
    <main className="front-page front-account-page">
      <div className="front-account-scroll">
        <section className={`front-login-card ${logged ? "logged-in" : ""}`}>
          <div className="front-login-mark">{logged ? "微" : "囊"}</div>
          <div className="front-login-copy">
            <strong>{logged ? "微信用户" : "登录小青囊"}</strong>
            <span>
              {logged ? "已登录 · 记录保存在本机" : "同步收藏、笔记和阅读记录"}
            </span>
          </div>
          <button onClick={logged ? logout : login}>
            {logged ? "退出" : "微信登录"}
          </button>
        </section>
        <section className="front-library-card">
          <div className="front-library-tabs">
            <button
              className={tab === "favorites" ? "active" : ""}
              onClick={() => setTab("favorites")}
            >
              收藏 <small>{favoriteIds.length}</small>
            </button>
            <button
              className={tab === "notes" ? "active" : ""}
              onClick={() => setTab("notes")}
            >
              笔记 <small>{noteItems.length}</small>
            </button>
          </div>
          {visible.length > 0 ? (
            <div className="front-library-list">
              {visible.map((item) => (
                <Link href={`/article/${item.id}`} key={`${tab}-${item.id}`}>
                  <strong>{item.title}</strong>
                  <span>{item.note || "打开资料"}</span>
                  <b>›</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="front-empty-state">
              <div>{tab === "favorites" ? "藏" : "记"}</div>
              <strong>
                {tab === "favorites" ? "还没有收藏" : "还没有笔记"}
              </strong>
              <span>
                {tab === "favorites"
                  ? "阅读资料时，看到重要内容可以收藏。"
                  : "阅读资料时，可以写下自己的记录。"}
              </span>
            </div>
          )}
        </section>
        <p className="front-privacy-note">
          当前为本地测试登录。正式接入公众号授权后，收藏和笔记可跨设备同步。
        </p>
      </div>
      <FrontBottomNav active="account" />
    </main>
  );
}
