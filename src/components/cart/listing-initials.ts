/**
 * The letters drawn in the box where a photo would be.
 *
 * Most of a shop's catalogue has no picture, and an empty grey square says
 * nothing about which line it belongs to — so the box carries the goods' own
 * initial instead, the way a contact list does. The rule is the contact list's
 * too: the first letter of each of the first two words, so `Kopi Susu 250ml`
 * reads `KS` and a one-word name gives its one letter.
 *
 * A word only counts when what is left of it *starts* with a letter — a quote or
 * a bracket in front of a name is not part of it, but a digit is: a `2 pcs
 * plastik` line reads `PP`, not `2P`, because a digit is a count, not a name. A
 * name with nothing to read (blank, digits and punctuation only) gives `""` — the
 * card draws the box empty rather than putting a stray glyph in it, which is what
 * a `+manual` line looks like before the operator types anything.
 */
export function listingInitials(name: string): string {
  const letters: string[] = [];
  for (const word of name.split(/\s+/)) {
    // `"Kopi"` is `Kopi`; `250ml` stays a size and is passed over.
    const bare = word.replace(/^[^\p{L}\p{N}]+/u, "");
    const first = [...bare][0];
    if (first === undefined || !/\p{L}/u.test(first)) continue;
    letters.push(first.toLocaleUpperCase("id-ID"));
    if (letters.length === 2) break;
  }
  return letters.join("");
}
