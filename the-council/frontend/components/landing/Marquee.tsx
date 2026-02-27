const ADVISOR_NAMES = [
  "John D. Rockefeller",
  "Napoleon Bonaparte",
  "Marcus Aurelius",
  "Cleopatra VII",
  "Sun Tzu",
  "Madam C.J. Walker",
  "Otto von Bismarck",
  "Victor Frankl",
  "Wim Hof",
  "Richard Feynman",
  "Leonardo da Vinci",
  "Socrates",
];

const DIVIDER = (
  <span style={{ color: "#8B7355", opacity: 0.5 }} className="mx-4 font-display">
    ✦
  </span>
);

const TRACK_CONTENT = (
  <>
    {ADVISOR_NAMES.map((name, i) => (
      <span key={i} className="inline-flex items-center whitespace-nowrap">
        <span className="font-display text-sm tracking-wide" style={{ color: "#8B7355" }}>
          {name}
        </span>
        {DIVIDER}
      </span>
    ))}
  </>
);

export default function Marquee() {
  return (
    <div
      className="relative overflow-hidden py-4 border-y border-council-border"
      style={{ background: "#0A0A12" }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #0A0A12, transparent)" }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #0A0A12, transparent)" }}
      />

      <div className="flex animate-marquee">
        {/* Two identical copies for seamless loop */}
        <div className="flex shrink-0">{TRACK_CONTENT}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {TRACK_CONTENT}
        </div>
      </div>
    </div>
  );
}
