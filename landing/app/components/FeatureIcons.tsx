"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faCommentDots,
  faQrcode,
  faLock,
  faCarSide,
  faLocationDot,
  faDroplet,
  faCalendarCheck,
} from "@fortawesome/free-solid-svg-icons";

// Font Awesome solid throughout, rather than the outline-to-fill swap that was
// asked for first. Measured: FA Free ships a regular weight for only three of
// these eight — bell, comment and credit card. QR, lock, car, location and
// droplet are solid-only in the free set, so an outline-to-fill hover would
// have animated three icons and left five sitting still, which reads as broken
// rather than subtle. FA Pro has the weights; this is what the free set can do
// honestly.
//
// The hover fills the tile instead of the glyph. That is the caution yellow off
// the sticker, and dark navy on it measures 14.3:1.
const FEATURES: [string, IconDefinition][] = [
  ["Instant Scan Alert", faBell],
  ["Anonymous Chat", faCommentDots],
  ["No App to Scan", faQrcode],
  ["Number Private", faLock],
  ["Any Vehicle Type", faCarSide],
  ["Share Your ETA", faLocationDot],
  ["Waterproof Tag", faDroplet],
  ["1 Year Included", faCalendarCheck],
];

export function FeatureIcons() {
  return (
    // Four across at every width, so the eight always read as two rows of four.
    // Eight in a single line turned a block you scan into a strip you skim
    // past, and left the labels cramped under gaps wide enough to break the
    // pairing between a label and its icon.
    <div className="grid grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-4 sm:gap-x-8">
      {FEATURES.map(([label, icon]) => (
        <div key={label} className="group flex flex-col items-center gap-3 text-center">
          <span
            className="
              flex h-12 w-12 items-center justify-center rounded-2xl
              border border-[#E3E8EF] bg-white text-[#495B7B]
              transition-colors duration-200
              group-hover:border-[#FEE600] group-hover:bg-[#FEE600] group-hover:text-[#03162D]
            "
          >
            <FontAwesomeIcon icon={icon} className="h-[19px] w-[19px]" />
          </span>
          <span className="text-[11px] font-medium leading-tight text-[#495B7B] transition-colors duration-200 group-hover:text-[#03162D]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
