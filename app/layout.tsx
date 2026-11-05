import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LPBF Process Map",
  description:
    "Interactive laser powder bed fusion process window for 316L, 17-4PH, Ti-6Al-4V and AlSi10Mg using a Rosenthal melt-pool estimate and published defect criteria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
