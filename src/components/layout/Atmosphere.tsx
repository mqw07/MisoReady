import type { CSSProperties } from "react";
import { CloudBank, PixelCloud, PixelSparkle, type CloudKind } from "../pixel/decor.tsx";

/** Position, size, and drift timing for each loose cloud above the bank. Widths are in rem. */
const clouds: readonly {
  kind: CloudKind;
  width: string;
  position: CSSProperties;
  seconds: number;
  delay: number;
}[] = [
  { kind: "wide", width: "30rem", position: { top: "-1.5rem", left: "-4rem" }, seconds: 110, delay: 0 },
  { kind: "tall", width: "15rem", position: { top: "-0.5rem", left: "38%" }, seconds: 130, delay: -40 },
  { kind: "wisp", width: "13rem", position: { top: "1.5rem", right: "9%" }, seconds: 90, delay: -25 },
  { kind: "small", width: "9rem", position: { top: "3.2rem", right: "-1rem" }, seconds: 100, delay: -60 },
];

/**
 * Pale blue sky with a big cream cloud bank, as in the reference hero. The bank is the same
 * colour as the page, so the banner melts into the dashboard; a thin line closes it.
 * On the Today page the right end carries the ledge Miso sits on, flush with the banner bottom.
 */
export function Atmosphere({ hero }: { hero: boolean }) {
  return (
    <div
      className={`decor absolute inset-x-0 top-0 overflow-hidden border-b-2 border-[#eddcca] bg-sky ${
        hero ? "h-[285px] lg:h-[224px]" : "h-[229px] lg:h-[168px]"
      }`}
      aria-hidden="true"
    >
      <CloudBank />
      {clouds.map((cloud, index) => (
        <div
          key={`${cloud.kind}-${index}`}
          className="cloud-drift absolute"
          style={{
            ...cloud.position,
            width: cloud.width,
            animationDuration: `${cloud.seconds}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <PixelCloud kind={cloud.kind} className="w-full" />
        </div>
      ))}
      <PixelSparkle className="absolute top-8 left-[44%] h-4" />
      <PixelSparkle className="absolute top-[4.5rem] right-[5%] h-5" />
      {hero ? (
        <div
          className="absolute right-0 bottom-0 hidden h-[14px] border-b-[3px] border-[#c89877] bg-[#ddae8c] md:block"
          style={{ width: "calc(23rem + 3rem + max(0px, (100% - 72rem) / 2))" }}
        >
          <div className="h-[3px] bg-[#ebc4a5]" />
        </div>
      ) : null}
    </div>
  );
}
