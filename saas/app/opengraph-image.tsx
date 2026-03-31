import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "56px",
          background:
            "radial-gradient(circle at top left, rgba(123,242,207,0.28), transparent 30%), linear-gradient(135deg, #07151a, #0b2f35 58%, #11363f)",
          color: "#ecfbf7",
          fontFamily: "Segoe UI"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "36px",
            padding: "42px",
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: "#7bf2cf", letterSpacing: 3 }}>
            TRANSCRIPT STUDIO
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: 760 }}>
            <div style={{ fontSize: 74, lineHeight: 1, fontWeight: 700 }}>
              Upload media. Generate transcripts. Grow subscription revenue.
            </div>
            <div style={{ fontSize: 30, lineHeight: 1.4, color: "#c6e6de" }}>
              Audio and video transcription SaaS for creators, agencies, and modern teams.
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Billing ready", "SEO ready", "PWA ready"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#d9fff4",
                  fontSize: 24
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
