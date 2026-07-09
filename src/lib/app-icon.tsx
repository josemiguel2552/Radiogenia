import { ImageResponse } from "next/og";

/** Renders the "R" gradient mark (same design as src/app/icon.tsx) at any size. */
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
        <svg
          width={22 * scale}
          height={22 * scale}
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 3h7a5 5 0 0 1 0 10h-3l5 6"
            stroke="white"
            strokeWidth={2.6 * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 4 * scale,
            right: 4 * scale,
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
