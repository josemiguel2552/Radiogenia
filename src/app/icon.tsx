import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 3h7a5 5 0 0 1 0 10h-3l5 6"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#c4b5fd",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
