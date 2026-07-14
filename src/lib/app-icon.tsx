import { ImageResponse } from "next/og";

/**
 * Renders the Radiogen.AI app icon at any size.
 *
 * Uses a real bold "R" glyph rather than a stroked SVG <path>: the next/og
 * rendering engine (Satori) renders text crisply but mangles stroked vector
 * paths (they came out as a white blob), which is why the favicon looked
 * broken. Background gradient + accent dot mirror the in-app Logo mark.
 */
export function renderAppIcon(size: number) {
  const scale = size / 32;
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 7 * scale,
          background: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 21 * scale,
            fontWeight: 800,
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: -0.5 * scale,
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 5 * scale,
            right: 5 * scale,
            width: 5 * scale,
            height: 5 * scale,
            borderRadius: "50%",
            background: "#c4b5fd",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
