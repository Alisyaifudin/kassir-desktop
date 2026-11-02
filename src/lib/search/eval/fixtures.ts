/**
 * The catalogue and query set the harness scores every ranker against.
 *
 * Three rules make this set useful rather than decorative:
 *
 * 1. **The catalogue is mostly near-duplicate families.** `Gula Pasir 1kg` and
 *    `Gula Pasir 500g`, `Aqua 600ml` and `Aqua Galon`. That is what a real grosir
 *    shelf looks like, and it is where the shipped ladder loses: both members of
 *    a family earn the *same* tier constant, so `rankHits` (a stable sort) hands
 *    the win to whichever id the catalogue happened to list first.
 *
 * 2. **The interleaving is balanced, not stacked.** The preferred sibling is
 *    listed first in about half the families and second in the other half. The
 *    catalogue's real order is whatever SQLite returns, which has nothing to do
 *    with what the cashier means, so a 50/50 split is the honest model. An order
 *    that flattered the baseline would hide the tie-break bug; one that punished
 *    it would overstate the case for a fix.
 *
 * 3. **Every case says which failure it reproduces**, and separates "correct
 *    answer" from "the answer they meant" (see `QueryCase`). Without that split a
 *    ranking bug reads as a recall win.
 *
 * `catalogue` and `queries` are exported for the harness; `eval.test.ts` checks
 * that every id a case names actually exists, so a typo here fails loudly.
 */
import type { CatalogueItem, QueryCase } from "./types";

function item(
  id: string,
  name: string,
  code: string | null,
  productName: string,
  sold: number,
  altNames: string[] = [],
): CatalogueItem {
  return { id, name, code, productName, altNames, sold };
}

export const catalogue: CatalogueItem[] = [
  // ── The reported failure ──────────────────────────────────────────────────
  // Typing `roll` surfaces the mascara above `Roll Rambut Besar`. Both names
  // contain `roll` as a whole word, so both earn an identical `tokenSet` and the
  // tie falls to array order — and this item is listed first *and* sells more,
  // so a popularity tie-break alone would make the answer worse, not better.
  // Only position recovers what the cashier meant.
  item("barenbliss-mascara", "Barenbliss Roll To Clean Mascara", "8940000000001", "Barenbliss", 90),
  item("roll-rambut-besar", "Roll Rambut Besar", "8940000000002", "Roll Rambut", 40),

  // The same defect via `hasBoundaryMatch`, which accepts *any* word boundary.
  // `ha` hits "hairpin" at index 12 and "Hanasui" at index 0; both grade as
  // TEXT.prefix, so a name that does not begin with `ha` wins on array order.
  item("2in1-hairpin", "2IN1 Volume HairPin", "8940000000003", "2IN1", 200),
  item("hanasui-lipcream", "Hanasui Lip Cream", "8940000000004", "Hanasui", 60),

  // ── Mie instan ────────────────────────────────────────────────────────────
  // "indomie goreng" is an exact name, so the plain one must beat Jumbo. Jumbo
  // sits first in the array on purpose: it makes the `swap` case below a real
  // race instead of a free win for exact-tie-order.
  item("ind-goreng-jumbo", "Indomie Goreng Jumbo", "8998866200211", "Indomie", 30),
  item("ind-goreng", "Indomie Goreng", "8998866200012", "Indomie", 210),
  item("ind-soto", "Indomie Soto", "8998866200036", "Indomie", 60),
  item("ind-ayam", "Indomie Ayam Bawang", "8998866200029", "Indomie", 75),
  item("sarimi-2", "Sarimi Isi 2", "8998866100011", "Sarimi", 40),

  // ── Gula — distractor first ───────────────────────────────────────────────
  item("gula-500", "Gula Pasir 500g", "8991000000500", "Gula Pasir", 45),
  item("gula-1kg", "Gula Pasir 1kg", "8991000001000", "Gula Pasir", 130),
  item("gula-merah", "Gula Merah 1kg", "8991000001500", "Gula Merah", 20),

  // ── Air — preferred first ─────────────────────────────────────────────────
  item("aqua-600", "Aqua 600ml", "8995000000600", "Aqua", 320),
  item("aqua-galon", "Aqua Galon", "8995000001900", "Aqua", 35),
  item("aqua-330", "Aqua 330ml", "8995000000330", "Aqua", 18),

  // ── Rokok — "Sampoerna" is a pure tie between A Mild and Mild ─────────────
  item("sampoerna-a", "Sampoerna A Mild 16", "8997000000016", "Sampoerna", 55),
  item("sampoerna-mild", "Sampoerna Mild 16", "8997000000023", "Sampoerna", 140),
  item("gg-surya", "Gudang Garam Surya 12", "8999000000012", "Gudang Garam", 90),
  item("gg-intl", "Gudang Garam International 12", "8999000000029", "Gudang Garam", 25),

  // ── Minyak — three-way tie, distractor first ──────────────────────────────
  item("minyak-sania-1l", "Minyak Goreng Sania 1L", "8901000001000", "Minyak Goreng", 40),
  item("minyak-sania-2l", "Minyak Goreng Sania 2L", "8901000002000", "Minyak Goreng", 95),
  item("minyak-bimoli-2l", "Minyak Goreng Bimoli 2L", "8901000003000", "Minyak Goreng", 30),

  // ── Beras — preferred first ───────────────────────────────────────────────
  item("beras-ramos-5", "Beras Ramos 5kg", "8904000005000", "Beras Ramos", 85),
  item("beras-ramos-10", "Beras Ramos 10kg", "8904000010000", "Beras Ramos", 12),
  item("beras-pandan-5", "Beras Pandan Wangi 5kg", "8904000015000", "Beras Pandan Wangi", 22),

  // ── Sabun — preferred first ───────────────────────────────────────────────
  item("sabun-lifebuoy-btg", "Sabun Lifebuoy Batang", "8908000001000", "Sabun Lifebuoy", 65),
  item("sabun-lifebuoy-cair", "Sabun Lifebuoy Cair 450ml", "8908000002000", "Sabun Lifebuoy", 20),

  // ── Deterjen — preferred first ────────────────────────────────────────────
  item("rinso-800", "Rinso Anti Noda 800g", "8910000000800", "Rinso", 70),
  item("rinso-cair", "Rinso Deterjen Cair 750ml", "8910000000750", "Rinso", 18),

  // ── Susu — distractor first ───────────────────────────────────────────────
  item("ultra-coklat", "Susu Ultra Milk Coklat 250ml", "8911000000250", "Ultra Milk", 60),
  item("ultra-putih", "Susu Ultra Milk Putih 250ml", "8911000000251", "Ultra Milk", 95),

  // ── Kopi — distractor first ───────────────────────────────────────────────
  item("kapal-api-mix", "Kopi Kapal Api Mix", "8913000000001", "Kopi Kapal Api", 33),
  item("kapal-api-special", "Kopi Kapal Api Special 165g", "8913000000165", "Kopi Kapal Api", 110),

  // ── Kecap — the alias mechanism, working ──────────────────────────────────
  item("kecap-bango", "Kecap Manis Bango 135ml", "8915000000135", "Kecap", 100, ["Bango"]),
  item("kecap-abc", "Kecap Manis ABC 135ml", "8915000000235", "Kecap", 40),

  // ── Telur — preferred first (the one family where order agrees with meaning) ─
  item("telur-ayam", "Telur Ayam 1kg", "8917000001000", "Telur", 150),
  item("telur-bebek", "Telur Bebek 1kg", "8917000002000", "Telur", 15),

  // ── Bumbu — a "goreng" distractor that must not outrank Indomie ───────────
  item("bumbu-nasgor", "Bumbu Nasi Goreng Indofood", "8919000000068", "Bumbu Instan", 25),

  // ── Roti ──────────────────────────────────────────────────────────────────
  item("sariroti-coklat", "Sari Roti Coklat", "8920000000001", "Sari Roti", 55),
  item("sariroti-keju", "Sari Roti Keju", "8920000000002", "Sari Roti", 48),

  // ── The rest: ordinary catalogue noise the ladder must not surface ─────────
  item("chitato", "Chitato Sapi Panggang 68g", "8922000000068", "Chitato", 44),
  item("oreo", "Oreo Vanilla 133g", "8923000000133", "Oreo", 66),
  item("tisu-paseo", "Tisu Paseo 250 Sheet", "8924000000250", "Paseo", 38),
  item("pampers-m", "Pampers M 20", "8925000000020", "Pampers", 14),
  item("sunlight", "Sunlight Jeruk Nipis 755ml", "8926000000755", "Sunlight", 52),
  item("sosro", "Teh Botol Sosro 350ml", "8927000000350", "Sosro", 88),
  item("minyak-telon", "Minyak Telon My Baby 60ml", "8928000000060", "My Baby", 9),
  item("garam", "Garam Beryodium 250g", "8929000000250", "Garam", 42),
  item("ajinomoto", "Ajinomoto 250g", "8930000000250", "Masako", 36, ["Micin"]),
  item("masako", "Masako Ayam 250g", "8931000000250", "Masako", 61),
  item("royco", "Royco Ayam 250g", "8932000000250", "Royco", 40),
  item("indomilk-skm", "Indomilk Susu Kental Manis 370g", "8933000000370", "Indomilk", 29),
];

const INDOMIE = ["ind-goreng", "ind-goreng-jumbo", "ind-soto", "ind-ayam"];
const GORENG = [...INDOMIE, "minyak-sania-1l", "minyak-sania-2l", "minyak-bimoli-2l", "bumbu-nasgor"];

export const queries: QueryCase[] = [
  // ── the reported case ─────────────────────────────────────────────────────
  {
    query: "roll",
    tags: ["confusable"],
    relevant: ["barenbliss-mascara", "roll-rambut-besar"],
    best: ["roll-rambut-besar"],
    note: "reported: 'roll' at word 0 lost to 'roll' at word 1",
  },
  {
    query: "ha",
    tags: ["prefix", "confusable"],
    relevant: ["hanasui-lipcream", "2in1-hairpin"],
    best: ["hanasui-lipcream"],
    note: "reported: 'Hanasui' buried by `ha` matching inside 'hairpin'",
  },

  // ── exact ─────────────────────────────────────────────────────────────────
  {
    query: "indomie goreng",
    tags: ["exact"],
    relevant: ["ind-goreng"],
    note: "exact name must beat the token-set sibling",
  },
  {
    query: "gula pasir 1kg",
    tags: ["exact"],
    relevant: ["gula-1kg"],
  },

  // ── code ──────────────────────────────────────────────────────────────────
  {
    query: "8998866200012",
    tags: ["code"],
    relevant: ["ind-goreng"],
    note: "a scanned barcode resolves to exactly one listing",
  },
  {
    query: "8995000000600",
    tags: ["code"],
    relevant: ["aqua-600"],
  },

  // ── prefix: what the till types first ─────────────────────────────────────
  {
    query: "ind",
    tags: ["prefix"],
    relevant: [...INDOMIE, "indomilk-skm"],
    note: "3 chars: every Indomie plus Indomilk — recall, not ranking",
  },
  {
    query: "aqu",
    tags: ["prefix"],
    relevant: ["aqua-600", "aqua-galon", "aqua-330"],
  },
  {
    query: "minyak gor",
    tags: ["prefix"],
    relevant: ["minyak-sania-1l", "minyak-sania-2l", "minyak-bimoli-2l"],
  },

  // ── typo ──────────────────────────────────────────────────────────────────
  {
    query: "indomy",
    tags: ["typo"],
    relevant: INDOMIE,
    note: "one substitution inside the brand word",
  },
  {
    query: "gula paser",
    tags: ["typo", "confusable"],
    relevant: ["gula-500", "gula-1kg"],
    best: ["gula-1kg"],
    note: "typo tier ties the whole family; the best seller must win",
  },

  // ── transposition ─────────────────────────────────────────────────────────
  {
    query: "goerng",
    tags: ["transposition"],
    relevant: GORENG,
    note: "OSA transposition inside 'goreng'",
  },

  // ── swap: word order reversed ─────────────────────────────────────────────
  {
    query: "goreng indomie",
    tags: ["swap", "confusable"],
    relevant: ["ind-goreng", "ind-goreng-jumbo"],
    best: ["ind-goreng"],
    note: "token-set ties Jumbo (listed first) with the plain one",
  },

  // ── abbrev ────────────────────────────────────────────────────────────────
  {
    query: "san 2l",
    tags: ["abbrev"],
    relevant: ["minyak-sania-2l"],
    note: "'san' is a mid-word prefix of 'sania'",
  },
  {
    query: "gula 1kg",
    tags: ["abbrev", "confusable"],
    relevant: ["gula-1kg", "gula-merah"],
    best: ["gula-1kg"],
    note: "both pass token-prefix; only one is white sugar",
  },

  // ── synonym: the cases only expansion or embeddings can reach ─────────────
  {
    query: "mie instan",
    tags: ["synonym"],
    relevant: [...INDOMIE, "sarimi-2"],
    note: "NOTHING matches today — no field contains 'mie' or 'instan'",
  },
  {
    query: "rokok",
    tags: ["synonym"],
    relevant: ["sampoerna-a", "sampoerna-mild", "gg-surya", "gg-intl"],
    note: "NOTHING matches today — the category word is never written down",
  },
  {
    query: "micin",
    tags: ["synonym"],
    relevant: ["ajinomoto"],
    note: "already works: an operator-recorded alias in product_names",
  },

  // ── confusable: pure same-tier ties resolved by catalogue order today ─────
  {
    query: "aqua",
    tags: ["confusable"],
    relevant: ["aqua-600", "aqua-galon", "aqua-330"],
    best: ["aqua-600"],
    note: "all three token-prefix at 0.68; 320 sold must beat 35 sold",
  },
  {
    query: "gula pasir",
    tags: ["confusable"],
    relevant: ["gula-500", "gula-1kg"],
    best: ["gula-1kg"],
  },
  {
    query: "sampoerna",
    tags: ["confusable"],
    relevant: ["sampoerna-a", "sampoerna-mild"],
    best: ["sampoerna-mild"],
    note: "A Mild is listed first and will win on order alone",
  },
  {
    query: "susu ultra",
    tags: ["confusable"],
    relevant: ["ultra-coklat", "ultra-putih"],
    best: ["ultra-putih"],
  },
  {
    query: "kopi kapal api",
    tags: ["confusable"],
    relevant: ["kapal-api-mix", "kapal-api-special"],
    best: ["kapal-api-special"],
  },
  {
    query: "rinso",
    tags: ["confusable"],
    relevant: ["rinso-800", "rinso-cair"],
    best: ["rinso-800"],
  },
  {
    query: "beras ramos",
    tags: ["confusable"],
    relevant: ["beras-ramos-5", "beras-ramos-10"],
    best: ["beras-ramos-5"],
  },
  {
    query: "minyak goreng",
    tags: ["confusable"],
    relevant: ["minyak-sania-1l", "minyak-sania-2l", "minyak-bimoli-2l"],
    best: ["minyak-sania-2l"],
    note: "1L is listed first; the 2L is the one that sells",
  },
  {
    query: "sabun lifebuoy",
    tags: ["confusable"],
    relevant: ["sabun-lifebuoy-btg", "sabun-lifebuoy-cair"],
    best: ["sabun-lifebuoy-btg"],
  },
  {
    query: "goreng",
    tags: ["confusable"],
    relevant: GORENG,
    best: ["ind-goreng"],
    note: "an 8-way tie at 0.86; the flagship must not lose to Bumbu Nasi Goreng",
  },
  {
    query: "telur",
    tags: ["confusable"],
    relevant: ["telur-ayam", "telur-bebek"],
    best: ["telur-ayam"],
  },
];
