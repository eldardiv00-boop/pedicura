import { useState } from "react";

export default function Reserve() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Front-end only: hand off to your backend / Lovable integration here.
    setDone(true);
  };

  return (
    <section id="reserve" className="relative z-10 px-6 pb-28 sm:px-10">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-800/60 bg-zinc-950 px-8 py-16 text-center shadow-2xl sm:px-16 sm:py-20">
        {/* glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent-500/30 blur-3xl"
        />
        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
            Generation 02 · Early access
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-extrabold tracking-tightest text-white sm:text-6xl">
            Bring the salon home.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
            Reserve Pedicura today and be first in line when Generation 02
            ships. No payment now.
          </p>

          {done ? (
            <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-accent-400/30 bg-accent-500/10 px-6 py-4 text-accent-200">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="m5 13 4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-medium">
                You&rsquo;re on the list — check your inbox.
              </span>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="reserve-email" className="sr-only">
                Email address
              </label>
              <input
                id="reserve-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-[52px] w-full rounded-full border border-zinc-700 bg-zinc-900 px-5 py-3.5 text-white placeholder-zinc-500 outline-none transition-all duration-300 focus:border-accent-400 focus:ring-2 focus:ring-accent-500/40"
              />
              <button
                type="submit"
                className="inline-flex h-[52px] shrink-0 items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-100"
              >
                Reserve now
              </button>
            </form>
          )}
          <p className="mt-5 text-xs text-zinc-500">
            Free shipping · 30-day trial · 2-year warranty
          </p>
        </div>
      </div>
    </section>
  );
}
