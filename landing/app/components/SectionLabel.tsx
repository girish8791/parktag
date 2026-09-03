// The eyebrow above a section heading.
//
// There were three of these doing the same job in three different ways:
// "Some Special Features" at 11px medium in slate with 0.28em tracking, "FAQ"
// at 12px semibold in slate with 0.2em, and "Pricing" at 12px bold in red with
// tracking-widest. Same role, three sizes, two colours and three letter
// spacings, which is why the page read as assembled rather than designed.
//
// Colours are the guideline's own red scale rather than the accent:
//   --pt-red-700 #B31C00  "text on red tints"  — 6.8:1 on white
//   --pt-red-300 #FFB6A8  "quiet border"
//
// The accent #FF2700 is what "Pricing" used, and it measures 3.8:1 on white —
// under the 4.5:1 AA floor for text this small. The red scale exists precisely
// so red can be read at label size, so this uses it.
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#FFB6A8] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B31C00]">
      {children}
    </span>
  );
}
