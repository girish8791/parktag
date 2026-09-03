// The eyebrow above a section heading, on every section.
//
// There were three of these doing one job in three ways: "Some Special
// Features" at 11px medium slate on 0.28em tracking, "FAQ" at 12px semibold
// slate on 0.2em, "Pricing" at 12px bold red on tracking-widest. Same role,
// three sizes, two colours, three letter spacings, which is what made the page
// read as assembled rather than designed.
//
// Filled red with white text. The red is --pt-red-600 #D92200 rather than the
// accent #FF2700: white on the accent measures 3.8:1, under the 4.5:1 AA floor
// for text this small, while #D92200 measures 5.0:1. The two are hard to tell
// apart side by side, and the guideline already uses #D92200 as the accent's
// hover, so it is not a colour invented for this.
//
// `tone="dark"` is for the navy sections, where a filled red pill on #03162D
// works but the same border treatment would not. Same fill, so the label reads
// identically down the page regardless of what it is sitting on.
export function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full bg-[#D92200] px-4 py-1.5 " +
        "text-[11px] font-bold uppercase tracking-[0.18em] text-white " +
        className
      }
    >
      {children}
    </span>
  );
}
