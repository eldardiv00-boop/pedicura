import {
  BoltIcon,
  ChipIcon,
  DropIcon,
  GaugeIcon,
  MotorIcon,
  SparkIcon,
} from "./icons";

const STATS = [
  { value: "2,400", unit: "rpm", label: "Brushless torque" },
  { value: "3", unit: "speeds", label: "Adaptive control" },
  { value: "45", unit: "days", label: "Per USB-C charge" },
  { value: "IPX6", unit: "", label: "Water resistant" },
];

const FEATURES = [
  {
    icon: MotorIcon,
    title: "Brushless precision drive",
    body: "A sealed brushless motor holds speed under load, so callus work stays smooth from first pass to last.",
    span: "lg:col-span-2",
  },
  {
    icon: GaugeIcon,
    title: "Pressure sensing",
    body: "Senses resistance and eases off before it ever feels harsh.",
    span: "",
  },
  {
    icon: ChipIcon,
    title: "OLED readout",
    body: "A crisp display shows speed and battery at a glance.",
    span: "",
  },
  {
    icon: BoltIcon,
    title: "USB-C fast charge",
    body: "Minutes on the cable, weeks of pedicures off it.",
    span: "",
  },
  {
    icon: SparkIcon,
    title: "Diamond-grit roller",
    body: "Swappable heads from fine polish to deep refinement, finished in rose-gold aluminum.",
    span: "lg:col-span-2",
  },
  {
    icon: DropIcon,
    title: "Rinse-ready",
    body: "Sealed IPX6 body wipes and washes clean in seconds.",
    span: "",
  },
];

export default function Features() {
  return (
    <section id="how" className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
      <div className="mx-auto max-w-7xl">
        {/* Stats strip */}
        <div
          id="specs"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-zinc-900/10 bg-zinc-900/10 lg:grid-cols-4"
        >
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/70 p-7 backdrop-blur-sm">
              <div className="flex items-baseline gap-1 text-zinc-900">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
                  {s.value}
                </span>
                <span className="text-sm font-semibold text-accent-600">
                  {s.unit}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section heading */}
        <div className="mx-auto mt-24 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-600">
            Designed inside and out
          </span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-tightest text-zinc-900 sm:text-5xl">
            Salon results, considered down to the last screw.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-600">
            Every part you saw fly apart has a job. Here is what makes Pedicura
            feel effortless in the hand.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.title}
                className={`group rounded-3xl border border-zinc-900/10 bg-white/70 p-7 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent-200 hover:shadow-xl hover:shadow-accent-500/5 ${f.span}`}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white transition-colors duration-300 group-hover:bg-accent-500">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-zinc-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
                  {f.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
