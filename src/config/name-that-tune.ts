/**
 * NAME THAT TUNE — the song list.
 *
 * Title and artist only — never audio. At round-start, the host's device
 * resolves each of these against Apple's public iTunes Search API
 * (https://itunes.apple.com/search), which returns an official ~30-second
 * preview clip hosted on Apple's own servers. The clip is streamed live from
 * there at play time; nothing is downloaded, stored, or committed here.
 * That's a deliberate line: this repo is public (GitHub Pages, see HANDOFF
 * §4), and a public git history is real distribution — even for a day, even
 * deletable afterward — in a way six phones at a party isn't. A title and an
 * artist name aren't anyone's copyrighted expression; the recording is, and
 * this file never touches it.
 *
 * Skews R&B / pop / hip-hop with a run of 90s–2000s R&B, per the actual
 * group's taste — famous, easy-to-recognise tracks on purpose. An obscure
 * deep cut makes a bad buzzer round; the fun is six people all knowing it
 * within two seconds.
 */

export type TuneEntry = { title: string; artist: string };

export const NAME_THAT_TUNE: TuneEntry[] = [
  { title: "No Scrubs", artist: "TLC" },
  { title: "Crazy in Love", artist: "Beyoncé" },
  { title: "Say My Name", artist: "Destiny's Child" },
  { title: "No One", artist: "Alicia Keys" },
  { title: "Ignition (Remix)", artist: "R. Kelly" },
  { title: "Songs in A Minor", artist: "Alicia Keys" },
  { title: "Too Close", artist: "Next" },
  { title: "Return of the Mack", artist: "Mark Morrison" },
  { title: "Waterfalls", artist: "TLC" },
  { title: "Are You That Somebody?", artist: "Aaliyah" },
  { title: "Try Again", artist: "Aaliyah" },
  { title: "Say It Right", artist: "Nelly Furtado" },
  { title: "Gold Digger", artist: "Kanye West" },
  { title: "Hey Ya!", artist: "OutKast" },
  { title: "In Da Club", artist: "50 Cent" },
  { title: "Yeah!", artist: "Usher" },
  { title: "Bad and Boujee", artist: "Migos" },
  { title: "HUMBLE.", artist: "Kendrick Lamar" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "As It Was", artist: "Harry Styles" },
  { title: "Flowers", artist: "Miley Cyrus" },
  { title: "Cruel Summer", artist: "Taylor Swift" },
  { title: "Peaches", artist: "Justin Bieber" },
  { title: "Location", artist: "Khalid" },
  { title: "Best Part", artist: "Daniel Caesar" },
  { title: "Sure Thing", artist: "Miguel" },
  { title: "Adorn", artist: "Miguel" },
  { title: "Talk to Me Nice", artist: "Jorja Smith" },
  { title: "Jenny Was a Friend of Mine", artist: "The Killers" },
  { title: "Mr. Brightside", artist: "The Killers" },
  { title: "Umbrella", artist: "Rihanna" },
  { title: "Work", artist: "Rihanna" },
  { title: "Party", artist: "Beyoncé" },
  { title: "Party in the U.S.A.", artist: "Miley Cyrus" },
  { title: "Low", artist: "Flo Rida" },
  { title: "Wobble", artist: "V.I.C." },
  { title: "Alane", artist: "Ykee Benda" },
  { title: "Jerusalema", artist: "Master KG" },
];
