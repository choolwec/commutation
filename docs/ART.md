# ART.md — the art pass

## Why this doc just got a lot shorter

The 1930s-rubber-hose/Fleischer style block wasn't giving the model "the
*linework* of Cuphead" — it was giving it Cuphead, the actual character,
gloves and all, every single time, no matter how many ways the prompt said
"no characters." That phrase is too strongly fused to one specific IP in
the model's training data to fight with wording; the fix isn't a better
sentence, it's not naming that style at all.

Two things follow from that, plus one budget constraint (8 generations
left, no room for further trial and error):

1. **New style, described from scratch, not by reference to an existing
   franchise** — see below. Built to actually match this app, which turns
   out to matter: the app is dark-themed (`--color-ink: #08070c` background,
   `--color-paper` text, per `src/app/globals.css`), not the "warm cream"
   the old prompts assumed. Nobody had checked that until now.
2. **Cut to the 8 pieces where an AI-generated image earns its place.**
   Every game already has bespoke flat-SVG key art — `src/games/tileArt.tsx`
   has a hand-built accent color and motif for all 21 games, `currentColor`
   fills, zero raster cost, zero drift risk. Spending generations
   re-illustrating a paintbrush or a coin flip that already exists as clean
   vector art is just credits burned on a duplicate. What SVG *can't* do is
   the moody, atmospheric, single-hero-image stuff — a whole stage bathed in
   one spotlight, a trophy mid-explosion of confetti. That's where these 8
   generations go. The app icon is cut too, for a different reason: it's
   better built as a fourth, crisp vector piece alongside the existing SVG
   set than gambled on a raster generation that has to survive being shrunk
   to a fingertip — say the word and I'll build it directly in code, no
   credits needed.

---

## The style, used verbatim in every block below

Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, **not a cartoon and not any existing
animated character or franchise**: thick confident black outlines, flat
poster-ink color fields, no soft airbrush gradients, no painterly
rendering. A single dramatic spotlight beam is the main light source.
Background is near-black, not white or cream. No characters anywhere — no
faces, no eyes, no hands, no human or animal figures of any kind, on any
object; everything in frame is an inanimate object or a light effect.
**Do not render film grain, halftone dots, or a vignette** — the app
already layers a noise/grain overlay over every page in CSS
(`.grain::before` in `globals.css`), so texture added inside the image just
fights the app's own texture. Keep the image itself clean and flat.

Each block below is that paragraph plus one accent color plus one scene,
already merged — copy the whole fenced block, paste it into davinci.ai,
nothing to assemble by hand. The repetition is deliberate: identical
wording across 8 separate generations is the only real lever for keeping
them feeling like one artist's hand.

**Model guidance:** Nano Banana Pro on the 2 items marked Pro (the two
single highest-visibility surfaces in the app); Nano Banana 2 on the rest.

---

### 1. `hub-hero.png`
- **Model:** Nano Banana Pro · **Ratio:** 3:4 · `src/components/Hub.tsx`
- **Why:** the single most-seen surface in the app — every device lands
  here first, all week.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Flame orange, #ff5c39, is the single accent color, used
only for the spotlight glow and key highlights; everything else stays
black, white, or near-black gray.

Scene: an empty stage in near-total darkness, one flame-colored spotlight
beam cutting straight down onto a spinning prize wheel and a card table, a
few cards frozen mid-air as if just thrown, a checkered floor fading into
black at the edges. Nothing happening yet — anticipation, the moment right
before a show starts.
```

### 2. `hall-vault.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** the Vault is "sealed until the day" (`HALL_BLURB.vault`).

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Flame orange, #ff5c39, is the single accent color, used
only for the spotlight glow and key highlights; everything else stays
black, white, or near-black gray.

Scene: a heavy vault door standing slightly ajar against black, a single
flame-colored beam of light spilling out through the gap, the edge of a
playing card just visible inside. Mysterious and theatrical, like
something is about to be revealed.
```

### 3. `hall-huddle.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** Huddle is "phone-in-hand, sat in a circle" (`HALL_BLURB.huddle`)
  — the cozy, low-key hall, opposite the Vault's drama.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Mint green, #34d399, is the single accent color, used only
for the spotlight glow and key highlights; everything else stays black,
white, or near-black gray.

Scene: a circle of phones laid face-up on a dark rug, each screen glowing
soft mint light, a couple of dice and a scattered deck of cards at the
center, everything else in warm near-black shadow. Low-lit and close, a
circle of friends rather than a stage.
```

### 4. `hall-arena.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** Arena is "TV is the stage" (`HALL_BLURB.arena`) — the big,
  spectacle-forward hall.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Gold, #ffc247, is the single accent color, used only for
the spotlight glow and key highlights; everything else stays black, white,
or near-black gray.

Scene: one large glowing screen on a stand, gold stage-lighting beams
crossing above it against near-total black, the floor marked out like a
game-show set. Bold and bright against a dark room.
```

### 5. `awards-hero.png`
- **Model:** Nano Banana Pro · **Ratio:** 3:4 · `src/components/Awards.tsx`
- **Why:** the emotional peak of the whole day — worth the Pro-tier spend.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Pink, #ec4899, is the single accent color, used only for
the spotlight glow and key highlights; everything else stays black, white,
or near-black gray.

Scene: a trophy cup at center stage, caught in an explosion of confetti
and streamers frozen mid-air, one triumphant pink-tinted spotlight beam
blasting down from above, black background. The biggest, most triumphant
moment in the piece — the confetti and light carry the joy, the trophy
itself has no face.
```

### 6. `game-clap-circle.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** one of the group's own twelve invented rounds
  (`docs/THEIR_ROUNDS.md`) — worth one hero piece of its own, per HANDOFF
  §14's "a third of the schedule is ours."

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no human or animal figures of any kind, on any object; everything in
frame is an inanimate object or a light effect. Hands are the one
exception in this piece specifically, described below — no other object
gets one. Do not render film grain, halftone dots, or a vignette — keep
the image itself clean and flat. Amber, #f59e0b, is the single accent
color, used only for glow and key highlights; everything else stays black,
white, or near-black gray.

Scene: a ring of stylized hands mid-clap, arranged in a circle like a
wreath — no arms, no bodies, no faces — amber impact lines and rhythm
marks radiating outward from each clap, against near-black.
```

### 7. `game-drawful.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** Arena's TV-first centerpiece, the highest-spectacle round in the
  app.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Orange, #f97316, is the single accent color, used only for
glow and key highlights; everything else stays black, white, or
near-black gray.

Scene: a fat paintbrush frozen mid-stroke across a canvas on an easel, an
orange arc of paint spatter frozen in the air behind it, fast motion-lines
trailing the brush tip, dark background. Energetic and mid-motion; the
brush itself has no face.
```

### 8. `game-truth-or-dare.png`
- **Model:** Nano Banana 2 · **Ratio:** 1:1
- **Why:** the Vault's flagship, the one game everyone already knows.

```text
Bold flat-vector poster illustration — think a hand-screenprinted vintage
jazz-club or stage-magic bill, not a cartoon and not any existing animated
character or franchise: thick confident black outlines, flat poster-ink
color fields, no soft airbrush gradients, no painterly rendering. A single
dramatic spotlight beam is the main light source. Background is
near-black, not white or cream. No characters anywhere — no faces, no
eyes, no hands, no human or animal figures of any kind, on any object;
everything in frame is an inanimate object or a light effect. Do not
render film grain, halftone dots, or a vignette — keep the image itself
clean and flat. Flame orange, #ff5c39, is the single accent color, used
only for glow and key highlights; everything else stays black, white, or
near-black gray.

Scene: a single playing card frozen mid-flip in a flame-lit spotlight, one
visible face reading "TRUTH" in bold poster lettering, dramatic
motion-lines trailing behind it against near-black.
```

---

## Everything else is already covered

`src/games/tileArt.tsx` has a bespoke SVG accent + motif for every one of
the other 19 games — Fibbage, Mafia, Paranoia, Spyfall, Who Wrote It, Know
Me Best, and the rest of the group's own rounds included. That's not a gap
to fill with more generations; it's already-shipped, zero-cost, on-brand
art. No further AI credits need to go toward game key art.

## After you've generated these 8

Come back and I'll wire them into `Hub.tsx`, `Launcher.tsx` (the three
hall cards), and `Awards.tsx`, and resize/compress everything for a
static-export PWA that needs to load fast on six phones at once — don't
worry about file size on the way out of davinci.ai, just download at
whatever resolution it gives you. Separately: say the word on the app icon
and I'll build it directly as a fourth vector piece, no generation needed.
