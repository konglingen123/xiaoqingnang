"use client";

import Link from "next/link";

type Active = "home" | "anthology" | "account";

export default function FrontBottomNav({ active }: { active: Active }) {
  const items: Array<{ key: Active; label: string; href: string }> = [
    { key: "home", label: "首页", href: "/" },
    { key: "anthology", label: "文集", href: "/anthology" },
    { key: "account", label: "我的", href: "/account" },
  ];
  return (
    <nav className="front-bottom-nav" aria-label="主导航">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`${item.key} ${item.key === active ? "active" : ""}`}
        >
          <span className="front-nav-mark" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
