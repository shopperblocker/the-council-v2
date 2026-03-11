import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The Council — Multi-Agent AI Advisory Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AGENTS = [
  { name: "Rockefeller", color: "#c9a84c" },
  { name: "Napoleon", color: "#b87333" },
  { name: "Bismarck", color: "#8b9467" },
  { name: "Madam Walker", color: "#cd7f32" },
  { name: "Marcus Aurelius", color: "#a0956b" },
  { name: "Feynman", color: "#d4a853" },
];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1628",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Background ambient glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(201,168,76,0.08), transparent)",
          }}
        />

        {/* Top gold rule */}
        <div
          style={{
            width: 80,
            height: 1,
            background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
            marginBottom: 32,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 300,
            color: "#c9a84c",
            letterSpacing: "0.15em",
            marginBottom: 12,
          }}
        >
          THE COUNCIL
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#9a8a6a",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          12 historical minds. One question.
        </div>

        {/* Agent badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 900,
          }}
        >
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
              style={{
                padding: "6px 16px",
                borderRadius: 24,
                background: `${agent.color}14`,
                border: `1px solid ${agent.color}50`,
                color: agent.color,
                fontSize: 14,
                letterSpacing: "0.08em",
              }}
            >
              {agent.name}
            </div>
          ))}
        </div>

        {/* Bottom gold rule */}
        <div
          style={{
            width: 80,
            height: 1,
            background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
            marginTop: 40,
            marginBottom: 16,
          }}
        />

        {/* Domain */}
        <div
          style={{
            fontSize: 14,
            color: "#4a5a7a",
            letterSpacing: "0.15em",
          }}
        >
          thecouncil.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
