/** Micro-copy for the bento homepage. Tile-specific one-liners only —
 *  everything substantive stays in site.ts. */

/** Category pools for the MeanwhileTile "3am log feed". */
export const MEANWHILE_LOG = {
  play: [
    "sekiro — attempt 47 · 2h 13m",
    "sekiro — why wont that monkey die",
    "sekiro — omg there's a third form",
    "sekiro — headlesssss!!!!",
    "sekiro — hesitation is defeat. i hesitated.",
    "valheim — wait where was the last time i died",
    "valheim — 4 bosses defeated · 212h",
    "valheim — RAID INCOMING!!!",
    "valheim — run, it's a troll!",
    "valheim — the boat sank. everything was on the boat.",
  ],
  read: [
    "one piece — ch. one-thousand-whatever. luffy did something stupid. it worked.",
    "berserk — still not okay.",
    "frieren — rewatch #3. it holds.",
    "monster — johan is behind you btw",
    "bleach — bankai. that's it. that's the log.",
  ],
  cook: [
    "aglio e olio — four ingredients. burned the garlic anyway.",
    "3am carbonara — eggs scrambled. technically no longer carbonara.",
    "pasta al dente — the smoke alarm disagrees.",
    "biryani attempt — the rice said no.",
    "ramen from scratch — never again. worth it.",
    "pasta water seasoned like the sea. a sea of tears.",
  ],
  loop: [
    "the bends — radiohead",
    "ok computer — radiohead",
    "505 — arctic monkeys",
    "am/pm — arctic monkeys",
    "the less i know the better — tame impala",
    "see you again — tyler, the creator",
    "fly me to the moon — frank sinatra",
    "can't take my eyes off you — frankie valli",
    "what a wonderful world — louis armstrong",
    "ode to the mets — the strokes",
    "the adults are talking — the strokes",
    "shinunoga e-wa — fujii kaze",
  ],
} as const;

export const DOOR_TEASER = [
  "a walkable pixel house.",
  "the record player works.",
  "the cat is asleep.",
] as const;

export const FOOTER_WHISPER =
  'the konami code still does something. so does typing "sekiro".';

export const HERO_QUOTES = [
  "himmel would have done the same.",
  "put these foolish ambitions to rest.",
  "stay frosty.",
  "press F to pay respects.",
  "for those who come after.",
  "one does not simply walk into mordor.",
  "i solemnly swear that i am up to no good.",
  "whatever happens, happens.",
  "sometimes science is more art than science.",
  "have you tried turning it off and on again?",
  "a wizard is never late.",
  "there is no secret ingredient.",
  "why waste time say lot word when few word do trick.",
] as const;

export const MORE_PROJECT_BLURBS: Record<string, string> = {
  Whimsy: "llm in your terminal",
  "Pokédex": "the pokéapi, dressed properly",
  "Digi-hex": "blockchain payments ledger",
  "The cliché TODO": "yes, the todo app",
  "This Portfolio": "the door is over there →",
};
