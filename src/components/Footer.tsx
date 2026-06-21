export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-zinc-900/10 px-6 py-12 sm:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-900">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-accent-300 to-accent-600" />
          </span>
          Pedicura
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-zinc-500">
          {["Design", "Technology", "Specs", "Support", "Privacy"].map((l) => (
            <a
              key={l}
              href="#top"
              className="transition-colors duration-300 hover:text-zinc-900"
            >
              {l}
            </a>
          ))}
        </nav>
        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} Pedicura. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
