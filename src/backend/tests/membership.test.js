// Tests for the membership screen.
//
// The screen sells something, so the numbers on it are the thing worth pinning:
// a price the browser could author, a saving that stopped being true when a
// price moved, or a trial length that says 45 days after the window was widened
// to 90 are all defects that look like copy.
import test, { before, after, describe } from "node:test";
import assert from "node:assert/strict";

import {
  startTestApp,
  stopTestApp,
  createTestOwner,
  purgeLoginCollections,
  clearLoginLock,
  uniqueAddress,
  TEST_ORIGIN
} from "./helpers.js";
import { PREMIUM_TRIAL_DAYS, DOCS_PER_SUBSCRIBED_TAG } from "../lib/core/vault.js";
import { membershipPlans, membershipFeatures } from "../lib/core/membership-plans.js";

const EMAIL = "membership-owner@parktag-test.invalid";
const PASSWORD = "membership-fixture-password-3b71";

let app;
let collections;
let cookie;

before(async () => {
  ({ app, collections } = await startTestApp());
  await purgeLoginCollections(collections);
  await createTestOwner(collections, { email: EMAIL, password: PASSWORD });
  await clearLoginLock(collections, EMAIL);

  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: uniqueAddress(),
    headers: { origin: TEST_ORIGIN },
    payload: { identifier: EMAIL, pin: PASSWORD }
  });
  assert.equal(login.statusCode, 200, `fixture sign-in failed: ${login.body}`);

  const jar = login.cookies.find((c) => c.name === "wavetag_session");
  cookie = `wavetag_session=${jar.value}`;
});

after(async () => {
  await collections.owners.deleteMany({ email: EMAIL });
  await purgeLoginCollections(collections);
  await stopTestApp(app);
});

function get(url, withCookie = true) {
  return app.inject({
    method: "GET",
    url,
    remoteAddress: uniqueAddress(),
    headers: withCookie ? { cookie } : {}
  });
}

describe("the membership catalogue", () => {
  test("it is not served without a session", async () => {
    const api = await get("/api/owner/membership", false);
    assert.equal(api.statusCode, 401);

    const page = await get("/owner-membership", false);
    assert.equal(page.statusCode, 302);
    assert.equal(page.headers.location, "/owner-login");
  });

  // The dashboard once carried a hardcoded 45-day trial that stayed wrong for a
  // whole release after the window was widened. The banner reads the constant.
  test("the trial banner tracks PREMIUM_TRIAL_DAYS", async () => {
    const body = (await get("/api/owner/membership")).json();

    assert.equal(body.trial.days, PREMIUM_TRIAL_DAYS);
    assert.equal(body.trial.headline, `${PREMIUM_TRIAL_DAYS} Days`);
  });

  // A saving typed in beside a price is a claim that silently becomes false the
  // first time either number moves.
  test("every advertised saving is arithmetically true", async () => {
    const { plans } = (await get("/api/owner/membership")).json();
    const monthly = plans.find((p) => p.months === 1);

    assert.ok(monthly, "there is no monthly plan to price the others against");

    for (const plan of plans) {
      const undiscounted = monthly.priceInr * plan.months;
      const expected =
        undiscounted <= plan.priceInr
          ? 0
          : Math.round(((undiscounted - plan.priceInr) / undiscounted) * 100);

      assert.equal(
        plan.savingPercent,
        expected,
        `${plan.label} claims ${plan.savingPercent}% off ₹${undiscounted} at ₹${plan.priceInr}`
      );
      assert.ok(plan.priceInr > 0, `${plan.label} has no price`);
    }
  });

  test("exactly one plan is flagged popular", async () => {
    const { plans } = (await get("/api/owner/membership")).json();
    assert.equal(plans.filter((p) => p.popular).length, 1);
  });

  // Every tile is something the product actually does, and the numbers come
  // from the entitlement constants rather than being written out again.
  test("the feature grid quotes the real document allowance", async () => {
    const { features } = (await get("/api/owner/membership")).json();
    const docs = features.find((f) => f.id === "documents");

    assert.ok(docs, "the document allowance is not listed");
    // includes(), not a RegExp built in a template literal: `` there is the
    // backspace character, not a word boundary, so the assertion silently
    // stopped testing the thing it is named after.
    assert.ok(
      docs.label.includes(String(DOCS_PER_SUBSCRIBED_TAG)),
      `the document tile reads "${docs.label}" but the allowance is ${DOCS_PER_SUBSCRIBED_TAG}`
    );
  });

  // Replaces two tests about the tag-type selector, which is gone: it had three
  // positions and one useful answer, so the grid is simply what a membership
  // buys. What still needs pinning is that the list is renderable.
  test("every feature is renderable and distinct", async () => {
    const { features } = (await get("/api/owner/membership")).json();

    assert.ok(features.length > 0, "the grid would render empty");

    for (const feature of features) {
      assert.ok(feature.id, "a feature has no id");
      assert.ok(feature.label && feature.label.trim(), `${feature.id} has no label`);
      assert.ok(feature.icon, `${feature.id} has no icon key`);
      assert.equal(feature.scopes, undefined, `${feature.id} still carries a tag-type scope`);
    }
  });

  // The selector is gone from the payload as well as the page, so a stale
  // client cannot resurrect a filter the server no longer describes.
  test("the payload no longer advertises tag types", async () => {
    const body = (await get("/api/owner/membership")).json();
    assert.equal(body.scopes, undefined);
  });

  // There is no membership SKU in SHOP_PRODUCTS and no recurring-billing path.
  // The flag is what stops the page opening a checkout that cannot complete;
  // when one is built, flipping it is the switch.
  test("checkout stays closed until a membership product exists", async () => {
    const body = (await get("/api/owner/membership")).json();
    assert.equal(body.checkoutEnabled, false);
  });

  test("the page satisfies the tightened policy it is served with", async () => {
    const response = await get("/owner-membership");
    assert.equal(response.statusCode, 200);

    const csp = response.headers["content-security-policy"] || "";
    const directive = (name) =>
      csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));

    assert.ok(!directive("script-src").includes("'unsafe-inline'"));
    assert.ok(!directive("style-src").includes("'unsafe-inline'"));
    assert.match(csp, /style-src-attr 'unsafe-inline'/);

    assert.ok(
      !/<style[^>]*>/i.test(response.body),
      "an inline <style> here is dropped silently and the screen renders unstyled"
    );
    assert.ok(!/\son(click|input|change|submit)\s*=/i.test(response.body));
    assert.match(response.headers["cache-control"] || "", /no-store/);

    const css = await get("/styles/owner-membership.css", false);
    assert.equal(css.statusCode, 200, "the stylesheet is not served");
  });

  // The screen is reached from the profile tab, and a card whose button goes
  // nowhere is the failure this catches.
  test("the profile card links to it", async () => {
    const page = await get("/owner-welcome");
    assert.equal(page.statusCode, 200);
    assert.match(page.body, /href="\/owner-membership"/);
  });
});

describe("the loading state", () => {
  // The skeleton must be in the MARKUP the server sends. membership.js is
  // type="module" and therefore deferred, so anything it injects arrives after
  // the parser has painted — a skeleton built in JavaScript is a skeleton
  // nobody sees, and the empty shell it was meant to replace is what ships.
  test("the placeholders are served with the page, not injected later", async () => {
    const body = (await get("/owner-membership")).body;

    assert.equal((body.match(/mb-sk-plan/g) || []).length, 3, "plan placeholders missing");
    // Matched on the unique placeholder class rather than on the attribute
    // starting with it: the number also carries a sizing class, and which is
    // written first is not what this asserts.
    assert.match(body, /id="mbTrialDays"[^>]*mb-sk-days/, "the trial number has no placeholder");
  });

  // A skeleton of the wrong length is still a layout shift, just an earlier
  // one: the tiles would appear and shove everything below them down the page.
  test("the tile count matches what the grid renders", async () => {
    const body = (await get("/owner-membership")).body;
    const { features } = (await get("/api/owner/membership")).json();

    const rendered = features.length;
    const placeholders = (body.match(/mb-sk-feat/g) || []).length;

    assert.equal(
      placeholders,
      rendered,
      `${placeholders} placeholders for ${rendered} tiles — the grid will jump when it fills`
    );
  });

  test("the shimmer is dropped for anyone who asks for reduced motion", async () => {
    const css = (await get("/styles/owner-membership.css", false)).body;

    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    const guarded = css.split("prefers-reduced-motion")[1] || "";
    assert.match(guarded, /animation:\s*none/, "the guard does not actually stop the animation");
  });
});

describe("pricing is legible on the card", () => {
  // Without a per-month rate, ₹249 sits beside ₹49 reading as five times the
  // price, and the annual plan — the best value on the row — looks like the
  // most expensive thing on the screen.
  test("every plan reports what it works out to per month", async () => {
    const { plans } = (await get("/api/owner/membership")).json();

    for (const plan of plans) {
      const exact = plan.priceInr / plan.months;

      assert.equal(plan.perMonthInr, Math.round(exact), `${plan.label} rate is wrong`);
      assert.equal(
        plan.perMonthExact,
        plan.perMonthInr === exact,
        `${plan.label} misreports whether its rate is exact`
      );
    }
  });

  // ₹149 over six months is ₹24.83. Printing a flat "₹25/mo" would advertise a
  // price we do not charge, so the flag is what earns the approximate sign.
  test("a rate that does not divide evenly is flagged approximate", async () => {
    const { plans } = (await get("/api/owner/membership")).json();

    const monthly = plans.find((p) => p.months === 1);
    assert.equal(monthly.perMonthExact, true, "the monthly plan must be exact");

    const uneven = plans.filter((p) => (p.priceInr / p.months) % 1 !== 0);
    for (const plan of uneven) {
      assert.equal(plan.perMonthExact, false, `${plan.label} claims an exact rate it does not have`);
    }
  });
});

describe("the look", () => {
  // The star the page is titled with. It was a bookmark glyph, and gold is the
  // one place on the screen that colour is allowed to appear.
  test("the title carries a gold star", async () => {
    const body = (await get("/owner-membership")).body;
    const css = (await get("/styles/owner-membership.css", false)).body;

    assert.match(body, /class="mb-title-ic"/, "the title has no icon");
    assert.match(css, /--gold:\s*#FFC02E/i, "gold is not a named token");
    assert.match(
      css.replace(/\/\*[\s\S]*?\*\//g, ""),
      /\.mb-title-ic\s*\{[^}]*color:\s*var\(--gold\)/,
      "the star does not use the gold token"
    );
  });

  // Gold on the star is deliberate. Gold anywhere else would put the page back
  // in the reference's colour scheme, which is the one thing it must not be.
  test("no other yellow reaches the stylesheet", async () => {
    const css = (await get("/styles/owner-membership.css", false)).body;
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");

    const isYellow = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return r > 180 && g > 150 && b < 120;
    };

    // Prove the detector bites before trusting it to pass. A version of this
    // check once carried a stray control character in its pattern, matched
    // nothing ever, and reported a clean sheet on a stylesheet full of colour.
    assert.ok(
      ["#FFD400", "#EAB308", "#FACC15"].every(isYellow),
      "the yellow detector does not recognise yellow, so it proves nothing"
    );

    const strays = (declarations.match(/#[0-9a-fA-F]{6}/g) || [])
      .filter(isYellow)
      .filter((hex) => hex.toLowerCase() !== "#ffc02e");

    assert.deepEqual(strays, [], `yellow outside the star token: ${strays.join(", ")}`);
  });
});

describe("the layout holds together at every width", () => {
  // A brace-depth walk, because a media block contains braces and a regex for
  // "a block" stops at the first one it meets.
  const blocks = (src) => {
    const out = [];
    let depth = 0;
    let start = 0;
    let head = "";
    let open = 0;

    for (let i = 0; i < src.length; i += 1) {
      if (src[i] === "{") {
        if (depth === 0) {
          head = src.slice(start, i).trim();
          open = i;
        }
        depth += 1;
      } else if (src[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          out.push({ head, body: src.slice(open + 1, i), at: start });
          start = i + 1;
        }
      }
    }

    return out;
  };

  // Every selector a media block touches must have its base rule EARLIER in the
  // file. A media query adds no specificity, so a breakpoint written above the
  // rules it overrides loses to them and does nothing at all — no warning, no
  // error, just a layout that never changes. This page shipped one (a
  // max-width: 350px block sitting above half the styles it named) and so did
  // the dashboard, whose shop grid stayed two columns at every width for a
  // release. Both were found by eye. This finds the next one.
  const deadOverrides = (css) => {
    const all = blocks(css.replace(/\/\*[\s\S]*?\*\//g, ""));
    const plain = all.filter((b) => !b.head.startsWith("@"));
    const dead = [];

    for (const media of all.filter((b) => b.head.startsWith("@media"))) {
      for (const inner of blocks(media.body)) {
        // Custom properties inherit, so a :root override inside a media block
        // is the intended pattern rather than a mistake.
        if (inner.head.startsWith(":root")) continue;

        const base = plain.filter((p) => p.head === inner.head);
        if (base.length && base[base.length - 1].at > media.at) dead.push(inner.head);
      }
    }

    return [...new Set(dead)];
  };

  test("no breakpoint is dead", async () => {
    // Prove the detector bites first. A checker that cannot fail is a passing
    // test that means nothing, which this suite has been caught shipping.
    assert.deepEqual(
      deadOverrides("@media (max-width: 400px) { .a { color: red; } }\n.a { color: blue; }"),
      [".a"],
      "the detector does not recognise a media block placed above its base rule"
    );

    const css = (await get("/styles/owner-membership.css", false)).body;
    assert.deepEqual(
      deadOverrides(css),
      [],
      "a breakpoint sits above the rules it overrides and therefore does nothing"
    );
  });

  // The content column, the header row and the fixed action button are three
  // separate boxes that have to share a left and right edge. The button used to
  // carry a literal 692px — which is 720 - 14 * 2, correct only while the
  // gutter was 14px and silently 14px off the column once it was not.
  test("the action button is derived from the column, not a copy of it", async () => {
    const css = (await get("/styles/owner-membership.css", false)).body.replace(/\/\*[\s\S]*?\*\//g, "");

    assert.ok(!/692px/.test(css), "the button still carries a hardcoded width");
    assert.match(
      css,
      /max-width:\s*calc\(var\(--wrap\) - var\(--gutter\) \* 2\)/,
      "the button width is not derived from the column tokens"
    );
    assert.match(
      css,
      /\.mb-wrap\s*\{[^}]*max-width:\s*var\(--wrap\)/,
      "the column does not use the token the button is measured against"
    );
  });

  // A section break has to be visibly bigger than the gaps inside a section, at
  // every breakpoint, or it stops reading as a break. These were 20px and 18px,
  // and the free-trial card floated between the hero above it and the plans
  // below with nothing to say which it belonged to.
  test("section gaps stay larger than block gaps at every breakpoint", async () => {
    const css = (await get("/styles/owner-membership.css", false)).body.replace(/\/\*[\s\S]*?\*\//g, "");
    const px = (body, name) => {
      const m = body.match(new RegExp(`--${name}:\\s*(\\d+)px`));
      return m ? Number(m[1]) : null;
    };

    const all = blocks(css);
    const root = all.find((b) => b.head === ":root");
    assert.ok(root, "the layout tokens are not declared on :root");

    const base = { sec: px(root.body, "space-sec"), blk: px(root.body, "space-blk") };
    assert.ok(base.sec && base.blk, "the rhythm is not tokenised");

    const scopes = [{ name: "base", ...base }];
    for (const media of all.filter((b) => b.head.startsWith("@media"))) {
      const inner = blocks(media.body).find((b) => b.head === ":root");
      if (!inner) continue;
      scopes.push({
        name: media.head,
        sec: px(inner.body, "space-sec") ?? base.sec,
        blk: px(inner.body, "space-blk") ?? base.blk
      });
    }

    assert.ok(scopes.length >= 4, `only ${scopes.length} layout scopes — that is not a ladder`);

    for (const scope of scopes) {
      assert.ok(
        scope.sec > scope.blk,
        `${scope.name} spaces sections at ${scope.sec}px and blocks at ${scope.blk}px, so there is no break`
      );
    }
  });

  // A placeholder of the wrong size is a layout shift, only an earlier one. The
  // cards resize at two breakpoints; the shimmer standing in for them has to
  // resize in the same block.
  test("the skeleton tracks the cards it stands in for", async () => {
    const css = (await get("/styles/owner-membership.css", false)).body.replace(/\/\*[\s\S]*?\*\//g, "");
    const all = blocks(css);
    const heightOf = (body, sel) => {
      const m = body.match(new RegExp(`\\${sel}\\s*\\{[^}]*min-height:\\s*(\\d+)px`));
      return m ? Number(m[1]) : null;
    };

    const scopes = [
      {
        name: "base",
        body: all.filter((b) => !b.head.startsWith("@")).map((b) => `${b.head}{${b.body}}`).join("\n")
      },
      ...all.filter((b) => b.head.startsWith("@media")).map((b) => ({ name: b.head, body: b.body }))
    ];

    let sized = 0;
    for (const scope of scopes) {
      const card = heightOf(scope.body, ".mb-plan");
      const skeleton = heightOf(scope.body, ".mb-sk-plan");
      if (card === null && skeleton === null) continue;
      sized += 1;
      assert.equal(
        skeleton,
        card,
        `${scope.name} sizes the plan card at ${card}px and its placeholder at ${skeleton}px`
      );
    }

    assert.ok(sized >= 2, "no breakpoint resizes the cards, so this proves nothing");
  });
});

describe("the plan module", () => {
  test("plan ids are unique, so a selection cannot be ambiguous", () => {
    const ids = membershipPlans().map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("feature ids are unique", () => {
    const ids = membershipFeatures().map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
