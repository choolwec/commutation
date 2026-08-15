/**
 * NAME THAT TUNE — the song list.
 *
 * Title and artist only — never audio. At round-start, the host's device
 * resolves each of these against Apple's public iTunes Search API
 * (https://itunes.apple.com/search), which returns an official ~30-second
 * preview clip AND official cover art, both hosted on Apple's own servers.
 * Both stream live from there at play time; nothing is downloaded, stored,
 * or committed here. That's a deliberate line: this repo is public (GitHub
 * Pages, see HANDOFF §4), and a public git history is real distribution —
 * even for a day, even deletable afterward — in a way six phones at a party
 * isn't. A title and an artist name aren't anyone's copyrighted expression;
 * the recording and its artwork are, and this file never touches either.
 *
 * Two tiers, mixed together rather than run in a block so the round doesn't
 * telegraph "now the old ones start": a handful of certified-classic R&B
 * everyone in the group would know on the first note, and — the bulk of the
 * deck — hip-hop / R&B / rap / pop from 2014 onward, including a run of
 * Afrobeats/Amapiano picks that land harder for this group than another
 * 2000s deep cut would. Famous, easy-to-recognise tracks on purpose: an
 * obscure deep cut makes a bad buzzer round, the fun is six people all
 * knowing it within two seconds.
 */

export type TuneEntry = { title: string; artist: string };

export const NAME_THAT_TUNE: TuneEntry[] = [
  // ── certified classics — the handful everyone already knows ─────────────
  { title: "No Scrubs", artist: "TLC" },
  { title: "Crazy in Love", artist: "Beyoncé" },
  { title: "Say My Name", artist: "Destiny's Child" },
  { title: "Waterfalls", artist: "TLC" },
  { title: "My Boo", artist: "Usher & Alicia Keys" },
  { title: "Are You That Somebody?", artist: "Aaliyah" },
  { title: "Too Close", artist: "Next" },
  { title: "Return of the Mack", artist: "Mark Morrison" },
  { title: "No One", artist: "Alicia Keys" },
  { title: "Yeah!", artist: "Usher ft. Lil Jon & Ludacris" },
  { title: "1, 2 Step", artist: "Ciara ft. Missy Elliott" },

  // ── 2014+ hip-hop / rap ──────────────────────────────────────────────────
  { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars" },
  { title: "HUMBLE.", artist: "Kendrick Lamar" },
  { title: "Not Like Us", artist: "Kendrick Lamar" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Bad and Boujee", artist: "Migos" },
  { title: "Sicko Mode", artist: "Travis Scott" },
  { title: "Old Town Road", artist: "Lil Nas X" },
  { title: "rockstar", artist: "Post Malone ft. 21 Savage" },
  { title: "WAP", artist: "Cardi B ft. Megan Thee Stallion" },
  { title: "Money Trees", artist: "Kendrick Lamar ft. Jay Rock" },

  // ── 2014+ R&B ────────────────────────────────────────────────────────────
  { title: "Location", artist: "Khalid" },
  { title: "Best Part", artist: "Daniel Caesar ft. H.E.R." },
  { title: "Talk to Me Nice", artist: "Jorja Smith" },
  { title: "Snooze", artist: "SZA" },
  { title: "Kill Bill", artist: "SZA" },
  { title: "Die For You", artist: "The Weeknd & Ariana Grande" },
  { title: "Work", artist: "Rihanna" },
  { title: "Break My Soul", artist: "Beyoncé" },
  { title: "Pink + White", artist: "Frank Ocean" },
  { title: "Nights", artist: "Frank Ocean" },

  // ── 2014+ pop ────────────────────────────────────────────────────────────
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "As It Was", artist: "Harry Styles" },
  { title: "Flowers", artist: "Miley Cyrus" },
  { title: "Cruel Summer", artist: "Taylor Swift" },
  { title: "Anti-Hero", artist: "Taylor Swift" },
  { title: "Peaches", artist: "Justin Bieber" },
  { title: "Espresso", artist: "Sabrina Carpenter" },
  { title: "Good 4 U", artist: "Olivia Rodrigo" },

  // ── 2014+ Afrobeats / Amapiano ───────────────────────────────────────────
  { title: "Water", artist: "Tyla" },
  { title: "Calm Down", artist: "Rema & Selena Gomez" },
  { title: "Essence", artist: "Wizkid ft. Tems" },
  { title: "Last Last", artist: "Burna Boy" },
  { title: "Unavailable", artist: "Davido ft. Musa Keys" },
  { title: "Rush", artist: "Ayra Starr" },
  { title: "Peru", artist: "Fireboy DML & Ed Sheeran" },
  { title: "Jerusalema", artist: "Master KG" },
  { title: "Alane", artist: "Ykee Benda" },
  { title: "Soco", artist: "Wizkid, Terri, Spotless & Ceeza Milli" },
  { title: "Sability", artist: "Asake & Wizkid" },
  { title: "Higher", artist: "Master KG ft. Mahalia & Burna Boy" },
];
