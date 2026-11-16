"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, ShoppingCart, UserRound, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useHydrated } from "@/hooks/use-hydrated";
import { authApi } from "@/lib/api/auth";
import { SESSION_EVENT } from "@/lib/session";
export default function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const path = usePathname(),
    router = useRouter();
  const ready = useHydrated();
  const count = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  const [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [admin, setAdmin] = useState(false);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty(
      "--site-header-height", `${header.getBoundingClientRect().height}px`,
    );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, [path]);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      const token = localStorage.getItem("token");
      void (token ? authApi.me() : Promise.resolve(null))
        .then((u) => { if (live && localStorage.getItem("token") === token) setAdmin(u?.role === "admin"); })
        .catch(() => { if (live && localStorage.getItem("token") === token) setAdmin(false); });
    };
    refresh();
    window.addEventListener(SESSION_EVENT, refresh);
    return () => {
      live = false;
      window.removeEventListener(SESSION_EVENT, refresh);
    };
  }, [path]);
  if (path.startsWith("/admin")) return null;
  return (
    <header ref={headerRef} className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <strong>BrewLite</strong>
          <span>Every cup tells the story of the bean</span>
        </Link>
        <div className="header-actions">
          <nav aria-label="Main navigation">
            {[
              ["HOME", "/"],
              ["MENU", "/menu"],
              ["ABOUT US", "/#about"],
            ].map(([label, url]) => (
              <Link
                key={url}
                href={url}
                className={path === url ? "active" : ""}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/menu" className="mobile-menu-link">
            MENU
          </Link>
          <button aria-label="Search" onClick={() => setSearch(!search)}>
            {search ? <X /> : <Search />}
          </button>
          <Link
            href="/cart"
            aria-label={`Cart, ${ready ? count : 0} items`}
            className="cart-link"
          >
            <ShoppingCart />
            {ready && count > 0 && <b>{count}</b>}
          </Link>
          <Link href="/account" aria-label="Account">
            <UserRound />
          </Link>
          {admin && (
            <Link href="/admin" className="admin-link">
              Admin
            </Link>
          )}
        </div>
      </div>
      {search && (
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(false);
            router.push("/menu?search=" + encodeURIComponent(query));
          }}
        >
          <input
            autoFocus
            aria-label="Search drinks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drinks..."
          />
          <button type="submit">Search</button>
        </form>
      )}
    </header>
  );
}
