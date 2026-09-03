// The public shop window at /get.
//
// Everything on this page that is a NUMBER comes from the server. The copy,
// the images and the ordering live here; prices, and the COD surcharge, are
// fetched from /api/shop/public-catalogue, which serves the same SHOP_PRODUCTS
// the order routes charge from.
//
// That split is the whole design. Prices are already written down in three
// places in this repo and have drifted apart once already; a storefront that
// quotes a figure the checkout does not charge is the worst place for it to
// happen again, because it is the first thing a stranger reads.
//
// So no amount anybody is CHARGED appears in this file. The one exception is
// `orig` below — the struck-through "was" price, which is a marketing claim
// rather than anything billed, and which is only rendered when it is genuinely
// above the price being charged.

// Display-only. `orig` is the struck-through "was" price, which is marketing
// copy rather than anything charged, so it belongs on this side.
const PACKS = [
  {
    id: "pt-car-1",
    desc: "One tag for the windscreen of one car.",
    image: "/images/shop-car.webp",
    orig: 499
  },
  {
    id: "pt-car-2",
    desc: "Best value — tag two cars, or the front and back of one.",
    image: "/images/shop-car-2.svg",
    orig: 799
  },
  {
    id: "pt-combo",
    desc: "Car and bike together, for the whole household.",
    image: "/images/shop-combo.svg",
    orig: 899
  },
  {
    id: "pt-bike-1",
    desc: "For a two-wheeler, front and back.",
    image: "/images/shop-bike.webp",
    orig: 499
  }
];

// The pack the hero and the sticky bar quote. Named rather than "the cheapest"
// or "the first": which pack leads is a merchandising decision, and deriving it
// from price would silently change the headline the day a price moves.
const HERO_PACK = "pt-car-2";

const byId = (id) => document.getElementById(id);

// Whole rupees. Every amount on the wire is paise, matching the order routes,
// so the conversion happens once, here.
function rupees(paise) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function renderChips(products) {
  const hero = products[HERO_PACK];
  const chip = document.querySelector(".gt-chip-price");
  if (!chip || !hero) return;

  // "Pack of 2 · ₹499" — the name already says which pack, so the chip does
  // not repeat the word ParkTag a third time on one screen.
  chip.textContent = `${hero.name.replace(/^ParkTag\s*/, "")} · ${rupees(hero.amountPaise)}`;
}

function renderCod(codPaise) {
  const el = byId("gtCod");
  if (!el) return;
  el.textContent = codPaise > 0 ? `${rupees(codPaise)}` : "nothing extra";
}

function renderPacks(products) {
  const list = byId("gtPacks");
  if (!list) return;

  const rows = [];
  for (const pack of PACKS) {
    const priced = products[pack.id];
    // A pack the server no longer sells is dropped rather than shown at a
    // guessed price. Silence beats an offer that cannot be honoured.
    if (!priced) continue;

    const li = document.createElement("li");
    li.className = "gt-pack";

    const img = document.createElement("img");
    img.src = pack.image;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    const bd = document.createElement("div");
    bd.className = "gt-pack-bd";

    const name = document.createElement("span");
    name.className = "gt-pack-n";
    name.textContent = priced.name;

    const desc = document.createElement("span");
    desc.className = "gt-pack-d";
    desc.textContent = pack.desc;

    const price = document.createElement("span");
    price.className = "gt-pack-price";

    const now = document.createElement("span");
    now.className = "gt-pack-now";
    now.textContent = rupees(priced.amountPaise);
    price.append(now);

    // The struck-through price is shown only when it is genuinely higher than
    // what is being charged. A "was" that is not above the "now" is not a
    // saving, and printing one anyway is the kind of thing that turns a
    // discount into a misleading price claim.
    if (pack.orig && pack.orig * 100 > priced.amountPaise) {
      const was = document.createElement("span");
      was.className = "gt-pack-was";
      was.textContent = `₹${pack.orig.toLocaleString("en-IN")}`;
      price.append(was);
    }

    bd.append(name, desc, price);

    const cta = document.createElement("a");
    cta.className = "gt-btn gt-pack-cta";
    cta.href = "/shop";
    cta.textContent = "Order";
    cta.dataset.sku = pack.id;
    cta.setAttribute("aria-label", `Order ${priced.name}`);

    li.append(img, bd, cta);
    rows.push(li);
  }

  list.replaceChildren(...rows);
}

function renderBar(products) {
  const hero = products[HERO_PACK];
  if (!hero) return;

  const name = byId("gtBarName");
  const sub = byId("gtBarSub");
  if (name) name.textContent = hero.name;
  if (sub) sub.textContent = `${rupees(hero.amountPaise)} · Free delivery · COD available`;
}

// A failure here must not leave shimmer running forever — a page that looks
// like it is still loading is worse than one that says it could not load.
// The CTAs are plain links to /shop and keep working regardless, so the offer
// is still reachable even when the price is not.
function failQuietly() {
  const chip = document.querySelector(".gt-chip-price");
  if (chip) chip.remove();

  const list = byId("gtPacks");
  if (list) list.replaceChildren();

  const cod = byId("gtCod");
  if (cod) cod.textContent = "a small handling fee";

  const note = byId("gtNote");
  if (note) {
    note.hidden = false;
    note.textContent = "Prices could not be loaded just now. Tap Order now and they will be shown at checkout.";
  }
}

async function load() {
  let payload;
  try {
    const res = await fetch("/api/shop/public-catalogue", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    payload = await res.json();
  } catch {
    failQuietly();
    return;
  }

  if (!payload || !payload.ok || !payload.products) {
    failQuietly();
    return;
  }

  renderChips(payload.products);
  renderCod(payload.codSurchargePaise || 0);
  renderPacks(payload.products);
  renderBar(payload.products);

  // Fired once the prices are actually on screen, not on DOMContentLoaded, so
  // "viewed the item" means a price was seen rather than that the page began
  // loading. This is the event the whole exercise is measured on: the ratio of
  // landing-site sessions to view_item is the size of the drop the login wall
  // was causing, and until this page existed there was nothing to count.
  if (window.ptTrack) {
    const hero = payload.products[HERO_PACK];
    ptTrack("view_item", {
      items: Object.entries(payload.products).map(([id, p]) => ({ item_id: id, item_name: p.name })),
      ...(hero ? { value: hero.amountPaise / 100, currency: "INR" } : {})
    });
  }
}

// Every Order control is a plain link to /shop, so checkout still works with
// no JS at all. This only reports the intent on the way past — hence a capture
// listener on the document rather than handlers bound to each button, which
// would have to be rebound every time the pack list re-renders.
document.addEventListener("click", (event) => {
  const link = event.target.closest && event.target.closest('a[href="/shop"]');
  if (!link || !window.ptTrack) return;

  ptTrack("begin_checkout", { method: "storefront", items: [{ item_id: link.dataset.sku || HERO_PACK, quantity: 1 }] });
});

load();
