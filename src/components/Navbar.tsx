import { useEffect, useState } from "react";

const LINKS = [
  { label: "Design", href: "#reveal" },
  { label: "Technology", href: "#how" },
  { label: "Specs", href: "#specs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-out ${
        scrolled
          ? "border-b border-zinc-900/5 bg-white/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10">
        <a
          href="#top"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-white">
            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-accent-300 to-accent-600" />
          </span>
          Pedicura
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 ease-out hover:bg-zinc-900/5 hover:text-zinc-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#reserve"
          className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-zinc-800"
        >
          Reserve
        </a>
      </nav>
    </header>
  );
}
