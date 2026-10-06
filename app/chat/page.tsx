"use client";
import Link from "next/link";
import { RED_FLAGS, SAFETY_STOP_TEXT } from "@/data/compliance";
import { useEffect, useState } from "react";
type Item = {
  id: string;
  title: string;
  summary?: string;
  type: "article" | "skill";
  methodName?: string;
};
export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    const areaId = params.get("areaId") || "";
    const areaName = params.get("areaName") || "身体部位";
    if (areaId) {
      setQuery(`已选择：${areaName}`);
      runArea(areaId, areaName);
    } else if (q) {
      setQuery(q);
      run(q);
    }
  }, []);
  async function runArea(areaId: string, areaName: string) {
    setSubmitted(`已选择：${areaName}`);
    setLoading(true);
    try {
      const r = await fetch(
        `/api/published-content?page=1&pageSize=30&mode=chat&areaId=${encodeURIComponent(areaId)}`,
      );
      const d = await r.json();
      setItems(d.contents || []);
    } finally {
      setLoading(false);
    }
  }
  async function run(q = query) {
    const value = q.trim();
    if (!value) return;
    if (RED_FLAGS.some((word) => value.includes(word))) {
      window.alert(SAFETY_STOP_TEXT);
      return;
    }
    setSubmitted(value);
    setLoading(true);
    try {
      const r = await fetch(
        `/api/published-content?page=1&pageSize=30&mode=chat&q=${encodeURIComponent(value)}`,
      );
      const d = await r.json();
      setItems(d.contents || []);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="chat-shell">
      <header className="chat-header">
        <Link href="/" className="back-button">
          ‹
        </Link>
        <div>
          <strong>小青囊</strong>
          <small>从已审核内容中查找</small>
        </div>
      </header>
      <section className="chat-body">
        {!submitted ? (
          <div className="chat-welcome">
            <div className="chat-mark">囊</div>
            <h1>你想了解哪里？</h1>
            <p>可以直接说身体部位、日常感受，或你想查找的内容。</p>
            <div className="quick-grid">
              {["腰部不舒服", "睡不好", "肩颈放松"].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    run(q);
                  }}
                >
                  {q}
                  <span>→</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="chat-user">{submitted}</div>
            <div className="chat-assistant">
              {loading
                ? "正在已审核内容中查找…"
                : items.length
                  ? `找到 ${items.length} 个相关内容`
                  : "暂时没有找到已审核的相关内容"}
            </div>
            {!loading && (
              <div className="chat-results">
                {items.map((item) => (
                  <Link
                    href={`/article/${item.id}`}
                    className="result-card"
                    key={item.id}
                  >
                    <span className="type">
                      {item.type === "article" ? "青囊文集" : "养护方法"}
                    </span>
                    <h3>{item.title || item.methodName}</h3>
                    <p>{item.summary || "查看完整说明"}</p>
                    <footer>打开详情 →</footer>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="说说你想了解的内容…"
        />
        <button>↑</button>
      </form>
    </main>
  );
}
