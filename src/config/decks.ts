/**
 * THE DECKS.
 *
 * Content for every game that does NOT run on survey answers. This file is
 * the reason the day works even if three people had ignored the survey
 * entirely: the Huddle and the Arena stand on their own, and the Vault is
 * the bonus rather than the foundation.
 *
 * House rules baked into everything here:
 *  - No drinking. Not a forfeit, not a dare, not a punishment. Untouched,
 *    always.
 *  - Platonic group, bolder register than the original build (loosened
 *    13 Aug 2026 from this file's old "sexual is not the register" line,
 *    by explicit direction): bolder, more embarrassing, flirtier, and more
 *    romantically pointed is all fair game for Truth or Dare and Never
 *    Have I Ever specifically. Truths (and NHIE's tap-then-talk shape) can
 *    ask about crushes, attraction, and dating history — that's talk, not
 *    an act. Hard ceiling, not negotiable: no dare may involve kissing,
 *    touching, or anything physically/sexually intimate, and nothing
 *    explicit, ever.
 *  - Nothing that breaks property, skin, or a friendship.
 *  - Anything requiring an object assumes a normal living room.
 */

// ─── SPYFALL ────────────────────────────────────────────────────────────────
// Everyone gets the location and a role; one phone says "you're the spy".
// Roles matter — "what are you wearing?" only has a right answer if you know
// your own job, and the spy bluffing a job they can't see is the whole game.

export type SpyfallLocation = { location: string; roles: string[] };

export const SPYFALL_LOCATIONS: SpyfallLocation[] = [
  { location: "A wedding reception", roles: ["The bride's uncle", "Wedding photographer", "The caterer", "An ex nobody invited", "Best man", "DJ"] },
  { location: "A hospital", roles: ["Surgeon", "A patient who's fine", "Night nurse", "Someone visiting", "Cleaner", "Ambulance driver"] },
  { location: "A long-haul flight", roles: ["Pilot", "Nervous flyer", "Flight attendant", "Person in the middle seat", "Air marshal", "Crying baby's parent"] },
  { location: "A church service", roles: ["The pastor", "Choir member", "Someone dragged there", "Usher", "Person taking the offering", "Visiting preacher"] },
  { location: "A police station", roles: ["Detective", "Someone giving a statement", "The one in the cell", "Desk sergeant", "A lawyer", "Cleaner"] },
  { location: "A funeral", roles: ["The grieving widow", "Distant cousin", "Person who barely knew them", "Priest", "Undertaker", "Someone crying too much"] },
  { location: "A university exam hall", roles: ["Invigilator", "Student who studied", "Student who didn't", "Someone finishing early", "The one who needs the toilet", "Late arrival"] },
  { location: "A barber shop", roles: ["The barber", "Regular customer", "Someone getting a bad cut", "Person just watching football", "Apprentice", "Someone waiting three hours"] },
  { location: "A supermarket", roles: ["Cashier", "Shelf stacker", "Someone with one item", "Security guard", "Parent with kids", "Person doing a full month's shop"] },
  { location: "A music festival", roles: ["Headline act", "Sound engineer", "Someone who lost their friends", "Security", "Person selling water", "The one filming everything"] },
  { location: "A bank", roles: ["Teller", "Branch manager", "Someone begging for a loan", "Security guard", "Customer in the wrong queue", "Person opening an account"] },
  { location: "A gym", roles: ["Personal trainer", "Someone on day one", "The one who lives there", "Receptionist", "Person only using the mirror", "Someone stretching for 40 minutes"] },
  { location: "A film set", roles: ["Director", "The lead actor", "Extra with no lines", "Makeup artist", "Boom operator", "Someone's assistant"] },
  { location: "A minibus", roles: ["The driver", "The conductor", "Passenger with too much luggage", "Someone standing", "Person who wants to get off", "Passenger playing loud music"] },
  { location: "A hotel", roles: ["Receptionist", "Housekeeper", "Guest complaining", "Someone sneaking in", "Concierge", "Person at the free breakfast"] },
  { location: "A courtroom", roles: ["Judge", "The accused", "Defence lawyer", "Juror not paying attention", "Court reporter", "Witness"] },
  { location: "A restaurant kitchen", roles: ["Head chef", "Dishwasher", "Waiter", "Health inspector", "New hire", "Someone on their break"] },
  { location: "A school staff room", roles: ["Head teacher", "Teacher who's had enough", "Newly qualified teacher", "Someone hiding from students", "Caretaker", "Person eating someone else's lunch"] },
  { location: "A football stadium", roles: ["Star player", "Referee", "A fan", "Commentator", "Person selling snacks", "Physio"] },
  { location: "A petrol station at 2am", roles: ["Night attendant", "Someone lost", "Person buying snacks", "Driver with no money", "Cleaner", "Someone on a road trip"] },
  { location: "A recording studio", roles: ["The artist", "Producer", "Session musician", "Label executive", "Someone's cousin", "Sound engineer"] },
  { location: "A cruise ship", roles: ["Captain", "Entertainer", "Passenger who's seasick", "Waiter", "Someone who's lost", "Person at the buffet"] },
  { location: "A market", roles: ["Vegetable seller", "Someone haggling hard", "Pickpocket's lookout", "Person carrying goods", "Regular customer", "Someone just browsing"] },
  { location: "A birthday party for a 6-year-old", roles: ["The birthday child", "Exhausted parent", "The entertainer", "Another parent judging", "Child who wants to go home", "Person who brought the wrong gift"] },
];

// ─── THE CHAMELEON ──────────────────────────────────────────────────────────
// A 4x4 grid everyone can see. Everyone but the chameleon knows which word.
// Say one word about it — too obvious and the chameleon guesses, too vague
// and the room votes for you.

export type ChameleonGrid = { topic: string; words: string[] };

export const CHAMELEON_GRIDS: ChameleonGrid[] = [
  { topic: "Films", words: ["Titanic", "Black Panther", "The Lion King", "Avatar", "Inception", "Shrek", "Jaws", "Frozen", "The Matrix", "Coming to America", "Get Out", "Toy Story", "Gladiator", "Spider-Man", "Mean Girls", "Jurassic Park"] },
  { topic: "Body parts", words: ["Elbow", "Knee", "Eyelash", "Ankle", "Thumb", "Spine", "Tongue", "Shoulder", "Nostril", "Heel", "Wrist", "Jaw", "Ribs", "Scalp", "Chin", "Hip"] },
  { topic: "Jobs", words: ["Teacher", "Pilot", "Nurse", "Farmer", "Lawyer", "Chef", "Driver", "Banker", "Plumber", "Journalist", "Barber", "Accountant", "Soldier", "Vet", "Electrician", "Pastor"] },
  { topic: "Foods", words: ["Nshima", "Rice", "Chicken", "Chips", "Beans", "Fish", "Bread", "Eggs", "Pasta", "Mangoes", "Groundnuts", "Cabbage", "Beef", "Sausage", "Porridge", "Samosa"] },
  { topic: "Animals", words: ["Lion", "Snake", "Elephant", "Goat", "Dog", "Chicken", "Crocodile", "Monkey", "Cow", "Cat", "Hippo", "Mosquito", "Eagle", "Fish", "Rat", "Giraffe"] },
  { topic: "Places in town", words: ["Market", "Church", "Bank", "Salon", "Bus station", "School", "Hospital", "Petrol station", "Bar", "Stadium", "Police station", "Shopping mall", "Restaurant", "Gym", "Cinema", "Car wash"] },
  { topic: "Things in a bedroom", words: ["Bed", "Mirror", "Wardrobe", "Charger", "Curtains", "Pillow", "Fan", "Lamp", "Phone", "Clothes on a chair", "Socks", "Blanket", "Alarm", "Shoes", "Water bottle", "Perfume"] },
  { topic: "Emotions", words: ["Jealousy", "Relief", "Embarrassment", "Rage", "Joy", "Boredom", "Guilt", "Panic", "Pride", "Loneliness", "Envy", "Regret", "Excitement", "Disgust", "Hope", "Shame"] },
  { topic: "Sports", words: ["Football", "Basketball", "Netball", "Swimming", "Boxing", "Athletics", "Tennis", "Volleyball", "Golf", "Rugby", "Cycling", "Chess", "Snooker", "Karate", "Cricket", "Table tennis"] },
  { topic: "Weather", words: ["Rain", "Drought", "Thunder", "Humid", "Breeze", "Heatwave", "Fog", "Hail", "Lightning", "Dust", "Cold morning", "Storm", "Clear sky", "Cloudy", "Sunset", "Flood"] },
  { topic: "School memories", words: ["Assembly", "Detention", "Exams", "School bus", "Uniform", "Break time", "Sports day", "Homework", "Head teacher", "Prefects", "Lunch", "Class trip", "Report card", "Cheating", "Best friend", "Bell"] },
  { topic: "On a phone", words: ["WhatsApp", "Instagram", "Camera", "Calculator", "Alarm", "Contacts", "Maps", "YouTube", "Bank app", "Notes", "Torch", "Spotify", "Screenshots", "Voice notes", "Battery", "TikTok"] },
  { topic: "Modes of transport", words: ["Minibus", "Taxi", "Walking", "Bicycle", "Aeroplane", "Train", "Motorbike", "Boat", "Bus", "Lorry", "Helicopter", "Running", "Donkey cart", "Uber", "Ambulance", "Ferry"] },
  { topic: "Musicians", words: ["Beyoncé", "Burna Boy", "Drake", "Rihanna", "Wizkid", "Adele", "Kendrick Lamar", "Ed Sheeran", "Tems", "Chris Brown", "Sauti Sol", "Yo Maps", "Davido", "SZA", "Asake", "Michael Jackson"] },
  { topic: "Reasons to be late", words: ["Traffic", "Overslept", "Lost keys", "Phone died", "Family emergency", "Wrong directions", "Waiting for someone", "Rain", "No transport money", "Forgot entirely", "Work", "Got a call", "Wardrobe crisis", "Queue at the shop", "Car trouble", "Time zone confusion"] },
  { topic: "Things you lose", words: ["Keys", "Phone", "Charger", "Umbrella", "Money", "Patience", "Socks", "Earphones", "ID", "Sunglasses", "Password", "Signal", "Weight", "A bet", "Your temper", "Your place in a queue"] },
];

// ─── FIBBAGE ────────────────────────────────────────────────────────────────
// A true but absurd fact with a blank. Everyone submits a lie, then finds
// the truth among them. Points for spotting it, more for fooling people.

export type FibbageFact = { prompt: string; answer: string };

export const FIBBAGE_FACTS: FibbageFact[] = [
  { prompt: "In 1518, hundreds of people in Strasbourg died from ___ that lasted a month.", answer: "dancing" },
  { prompt: "A group of flamingos is officially called a ___.", answer: "flamboyance" },
  { prompt: "Honey found in ancient Egyptian tombs was still ___ after 3,000 years.", answer: "edible" },
  { prompt: "The world record for the longest time spent ___ is over 11 days.", answer: "without sleep" },
  { prompt: "Wombat droppings are famously shaped like ___.", answer: "cubes" },
  { prompt: "In 1962, a factory in Tanzania closed for months because of an outbreak of ___.", answer: "laughter" },
  { prompt: "The shortest war in history lasted about 38 ___.", answer: "minutes" },
  { prompt: "Octopuses have three ___.", answer: "hearts" },
  { prompt: "In Switzerland it is illegal to own just one ___.", answer: "guinea pig" },
  { prompt: "The inventor of the Pringles can had his ashes buried in ___.", answer: "a Pringles can" },
  { prompt: "Bananas are berries, but ___ are not.", answer: "strawberries" },
  { prompt: "A single cloud can weigh more than a million ___.", answer: "pounds" },
  { prompt: "Sea otters hold ___ while they sleep so they don't drift apart.", answer: "hands" },
  { prompt: "The Eiffel Tower can grow about 15cm taller in ___.", answer: "summer" },
  { prompt: "Napoleon was once attacked by a horde of ___.", answer: "rabbits" },
  { prompt: "Scotland's national animal is the ___.", answer: "unicorn" },
  { prompt: "A crocodile cannot stick out its ___.", answer: "tongue" },
  { prompt: "In 1994, a man survived a plane crash and later died from ___.", answer: "a falling coconut" },
  { prompt: "Cows have best friends and get stressed when they are ___.", answer: "separated" },
  { prompt: "The dot over a lowercase 'i' is called a ___.", answer: "tittle" },
  { prompt: "Sloths can hold their breath longer than ___.", answer: "dolphins" },
  { prompt: "Astronauts cannot ___ in space because it needs gravity.", answer: "burp" },
  { prompt: "The average person spends about six months of their life waiting at ___.", answer: "red lights" },
  { prompt: "Bees can recognise individual human ___.", answer: "faces" },
  { prompt: "There are more possible games of chess than ___ in the observable universe.", answer: "atoms" },
  { prompt: "A jiffy is an actual unit of time equal to ___ of a second.", answer: "one hundredth" },
  { prompt: "Norway once knighted a ___.", answer: "penguin" },
  { prompt: "The longest recorded flight of a chicken is 13 ___.", answer: "seconds" },
  { prompt: "Sharks existed before ___ did.", answer: "trees" },
  { prompt: "In Japan there is a Kit Kat flavour made from ___.", answer: "soy sauce" },
];

// ─── TRIVIA / BUZZ IN ───────────────────────────────────────────────────────

export type TriviaQuestion = { q: string; options: string[]; answer: number };

export const TRIVIA: TriviaQuestion[] = [
  { q: "Before Lusaka, which city was the capital of Northern Rhodesia?", options: ["Ndola", "Livingstone", "Kabwe", "Kitwe"], answer: 1 },
  { q: "Which river forms Victoria Falls?", options: ["Congo", "Zambezi", "Nile", "Limpopo"], answer: 1 },
  { q: "How many players are on a netball team?", options: ["5", "6", "7", "11"], answer: 2 },
  { q: "Which planet currently has the most known moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], answer: 1 },
  { q: "Who wrote 'Things Fall Apart'?", options: ["Wole Soyinka", "Chinua Achebe", "Ngũgĩ wa Thiong'o", "Ben Okri"], answer: 1 },
  { q: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Transfer Text Process", "Hyperlink Transit Path", "Host Transfer Text Protocol"], answer: 0 },
  { q: "Which country won the 2022 FIFA World Cup?", options: ["France", "Brazil", "Argentina", "Germany"], answer: 2 },
  { q: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], answer: 1 },
  { q: "What is the second-largest ocean on Earth?", options: ["Indian", "Atlantic", "Arctic", "Southern"], answer: 1 },
  { q: "Which African country was never colonised?", options: ["Ghana", "Ethiopia", "Kenya", "Senegal"], answer: 1 },
  { q: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], answer: 2 },
  { q: "Which artist released the album 'Renaissance' in 2022?", options: ["Rihanna", "Beyoncé", "Adele", "SZA"], answer: 1 },
  { q: "Which country straddles all four hemispheres — north, south, east and west?", options: ["Brazil", "Indonesia", "Kiribati", "Ecuador"], answer: 2 },
  { q: "What is the longest river in Africa?", options: ["Congo", "Niger", "Zambezi", "Nile"], answer: 3 },
  { q: "Which NBA team has won the most championships?", options: ["Chicago Bulls", "Los Angeles Lakers", "Boston Celtics", "Golden State Warriors"], answer: 2 },
  { q: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Core Processing Unit"], answer: 0 },
  { q: "Which is the smallest country in the world?", options: ["Monaco", "Nauru", "Vatican City", "San Marino"], answer: 2 },
  { q: "How many time zones does Russia span?", options: ["7", "9", "11", "13"], answer: 2 },
  { q: "What is the currency of Zambia?", options: ["Shilling", "Kwacha", "Rand", "Naira"], answer: 1 },
  { q: "Which artist has the most Grammy wins of all time?", options: ["Beyoncé", "Quincy Jones", "Georg Solti", "Stevie Wonder"], answer: 0 },
  { q: "What is the hardest natural substance?", options: ["Steel", "Quartz", "Diamond", "Titanium"], answer: 2 },
  { q: "Which African country has the most official languages?", options: ["Nigeria", "South Africa", "Zambia", "Cameroon"], answer: 1 },
  { q: "How many minutes in a full football match, excluding stoppage?", options: ["80", "90", "100", "120"], answer: 1 },
  { q: "What gas makes up most of Earth's atmosphere by volume?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"], answer: 1 },
  { q: "Which country is home to the kangaroo?", options: ["New Zealand", "South Africa", "Australia", "Brazil"], answer: 2 },
  { q: "What is 15% of 240?", options: ["30", "32", "36", "40"], answer: 2 },
  { q: "Which language has the most native speakers?", options: ["English", "Spanish", "Mandarin Chinese", "Hindi"], answer: 2 },
  { q: "Apartheid-era South Africa was banned from the Olympics for how many straight Games?", options: ["3", "5", "7", "9"], answer: 2 },
  { q: "Which vitamin does your body make from sunlight?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], answer: 3 },
  { q: "What do the interior angles of a hexagon add up to?", options: ["540°", "600°", "720°", "900°"], answer: 2 },
];

// ─── DRAWFUL ────────────────────────────────────────────────────────────────
// Deliberately hard to draw. A prompt that's easy to draw is easy to title,
// and the game is the wrong titles.

export const DRAWFUL_PROMPTS: string[] = [
  "A goat running a business meeting",
  "Regret",
  "A pastor at a nightclub",
  "The last minibus home",
  "A chicken that owns property",
  "Someone lying badly",
  "Monday morning",
  "A very expensive sandwich",
  "Two friends who owe each other money",
  "The concept of Wi-Fi",
  "A dog attending university",
  "Someone who just remembered something embarrassing",
  "A politician apologising",
  "The moment before a crash",
  "An influencer with no followers",
  "A crocodile at a wedding",
  "Someone pretending to enjoy a gift",
  "The inside of a group chat",
  "A snake wearing trousers",
  "Being left on read",
  "A gym membership nobody uses",
  "Someone winning an argument alone in the shower",
  "A cat running for president",
  "The sound of a fire alarm",
  "Someone's last brain cell",
  "An awkward family photo",
  "A fish that has given up",
  "Waiting for a reply",
  "A very small man with a very large hat",
  "Someone who has clearly been caught",
  "The concept of Monday",
  "A cow doing yoga",
  "Someone arriving three hours late",
  "The worst haircut in history",
  "A tomato with ambitions",
  "Being the only sober person",
  "A phone on 1% battery",
  "Someone who thinks they're funny",
  "A pigeon with a secret",
  "The feeling of stepping on a plug",
];

// ─── BEST ANSWER (Quiplash-style) ───────────────────────────────────────────
// Supplements whatever the group wrote in the survey.

export const BEST_ANSWER_PROMPTS: string[] = [
  "The worst possible thing to say during a job interview",
  "A terrible name for a new church",
  "The real reason the Wi-Fi is slow",
  "What your last text message should have said instead",
  "A rejected slogan for Zambia's tourism board",
  "The worst advice to give someone getting married",
  "What to shout to clear a room instantly",
  "A terrible name for a baby",
  "The most suspicious thing to find in a friend's bag",
  "What you'd put on your own gravestone out of spite",
  "The worst possible superpower",
  "A bad excuse for missing your own birthday party",
  "What a dog would say if it could talk, first sentence only",
  "The worst thing to whisper at a funeral",
  "A terrible name for a restaurant",
  "The real contents of your search history",
  "What the group chat says when you leave",
  "The worst possible reason to be arrested",
  "A rejected slogan for a bank",
  "What to say when you've forgotten someone's name for the fourth time",
  "The worst possible thing to find in your food",
  "A terrible new national holiday",
  "What you'd do with exactly one million kwacha and one hour",
  "The most dishonest thing on your CV",
  "A bad name for a hair salon",
  "The worst possible first line of a speech",
  "What your phone would say about you in court",
  "A terrible theme for a wedding",
];

// ─── NEVER HAVE I EVER ──────────────────────────────────────────────────────
// Tiered. The host escalates as the day goes on.

export const NEVER_HAVE_I_EVER = {
  warm: [
    "Never have I ever fallen asleep in a meeting or a class",
    "Never have I ever pretended to know a song I'd never heard",
    "Never have I ever ghosted a group chat on purpose",
    "Never have I ever lied about my age",
    "Never have I ever cried at an advert",
    "Never have I ever forgotten someone's name mid-conversation with them",
    "Never have I ever pretended to be on the phone to avoid someone",
    "Never have I ever eaten something off the floor",
    "Never have I ever laughed at completely the wrong moment",
    "Never have I ever texted \"on my way\" before I'd even left the house",
    "Never have I ever stalked someone's social media the night before meeting them",
    "Never have I ever practiced a conversation in the mirror before actually having it",
  ],
  real: [
    "Never have I ever lied about where I was",
    "Never have I ever read a message I wasn't supposed to see",
    "Never have I ever liked someone's old photo just to see if they'd notice",
    "Never have I ever kept talking to someone after realising it wasn't going anywhere",
    "Never have I ever had a crush on someone I never told a single person about",
    "Never have I ever cancelled plans with someone to see someone else instead",
    "Never have I ever stayed up way too late texting someone I liked",
    "Never have I ever pretended to be single when I wasn't, even for a moment",
    "Never have I ever gotten jealous over someone I had no actual claim to",
    "Never have I ever fallen for someone based on their voice or texting alone",
    "Never have I ever rehearsed how I'd respond if someone confessed feelings for me",
    "Never have I ever unfollowed someone specifically to get over them",
  ],
  reckless: [
    "Never have I ever had a crush on a friend's sibling",
    "Never have I ever liked two people at once and not known who to choose",
    "Never have I ever fallen for someone I knew, at the time, was bad for me",
    "Never have I ever had feelings for someone in this exact room",
    "Never have I ever sent a message to the wrong person and panicked",
    "Never have I ever kept a secret that would genuinely ruin something if it got out",
    "Never have I ever judged someone in this room before I actually knew them",
    "Never have I ever wanted something — or someone — that belonged to a friend",
    "Never have I ever let a crush go because I was too scared to say anything",
    "Never have I ever been someone's rebound and known it at the time",
    "Never have I ever had a situationship I never fully explained to anyone",
    "Never have I ever caught real feelings from something that was supposed to be casual",
  ],
} as const;

// ─── TRUTH OR DARE FALLBACK ─────────────────────────────────────────────────
// Their own submissions come first; this is the reserve so the game never
// runs dry. Nothing here involves drinking, property damage, or anything
// that lands wrong in a platonic group.

export const TRUTHS = {
  warm: [
    "What's the most embarrassing thing on your phone right now?",
    "Who in this room would you trust to plan your entire day, no questions asked?",
    "What's a compliment you've been sitting on and never actually said out loud?",
    "Who's the last person you had even a tiny crush on, and how long did it last?",
    "If you had to set two people in this room up, who's the pair and why?",
    "What's the pettiest reason you've ever gone off someone?",
    "Who here gives the best 'meet-my-parents-first' first impression?",
    "What's a lie you've told to get out of a date — or into one?",
  ],
  real: [
    "Who in this room do you think is the most charming, and why them specifically?",
    "Have you ever had a crush on someone in this exact room? You don't have to name them.",
    "What's a type of person you're drawn to that would genuinely surprise this room?",
    "Who here gives you the most main-character energy on a night out?",
    "What's the most jealous you've ever been over someone — and was it fair?",
    "Who in this room do you think would be hardest to get over?",
    "What's something you've never forgiven an ex for?",
    "Who here do you think reads people best, and what have they probably picked up on about you?",
  ],
  reckless: [
    "Name the person in this room you'd most likely fall for in a different life, and give one real reason.",
    "Who here has given you butterflies at least once, even for a second?",
    "What's the thing about you that, if this room knew, would change how they flirt with you?",
    "Who in this room do you think has quietly been into someone here?",
    "What's the boldest thing you've ever done to get someone's attention?",
    "Who here would you take a second look at if you were meeting them for the first time tonight?",
    "What's a 'type' you have that nobody in this room would guess?",
    "Who's the one person in this room you've never been able to fully read — and does that intrigue you?",
  ],
} as const;

export const DARES = {
  warm: [
    "Text your last match or crush 'thinking of you' and show the room whatever reply you get",
    "Deliver your most convincing pickup line straight at whoever the room points to — full eye contact, no laughing, no breaking character",
    "Let the room pick who you have to compliment, out loud, for a full minute, no repeating yourself",
    "Call the fifth person in your recent calls and sing them happy birthday",
    "Let the group pick your profile picture for the next 24 hours",
    "Post 'feeling single and ready to mingle' as your status until your next turn",
    "Do a dramatic slow-motion entrance across the room like you're about to confess your love to someone here",
    "Look someone in this room dead in the eye and tell them the one thing you'd change about them if you could — kindly, but honestly",
  ],
  real: [
    "Read out your last five text messages, sender names included",
    "Let the room write your dating-app bio for you, then read it exactly as written, straight-faced",
    "Call someone and ask them, dead serious, if they've ever had a crush on you",
    "Show the room the last profile you double-tapped or lingered on",
    "Do your impression of how you flirt when you're nervous — aimed at whoever the room points to, full commitment",
    "Sing one verse of a song the room picks like you mean every word, maintaining eye contact with one person in this room the whole time",
    "Reveal who's saved in your phone under a nickname, and what the nickname is",
    "Send a voice note to the group chat confessing your most embarrassing celebrity crush",
  ],
  reckless: [
    "Text the last person you had a crush on exactly what the room tells you to say",
    "Let the room read one real conversation of their choosing from your phone, out loud",
    "Look each person in this room in the eye, one at a time, and say one honest thing you find attractive about them — no repeats, no skipping anyone",
    "Reveal the actual contact name you've saved someone in this room under",
    "Let the group ask you three questions about your love life — no passes, no lies, no vague answers",
    "Do your most dramatic 'this is my villain origin story' monologue about your worst rejection",
    "Read today's horoscope out loud, directed at whoever the room points to, like it's a declaration of love",
    "The room picks one person here — give them a genuine, unjoking compliment for 30 seconds straight, no breaking eye contact",
  ],
} as const;

// ─── HOT TAKES SPECTRUMS ────────────────────────────────────────────────────
// One player secretly sees a target on the dial and gives one clue.

export const HOT_TAKE_SPECTRUMS: [string, string][] = [
  ["Overrated", "Underrated"],
  ["Acceptable", "Unforgivable"],
  ["Cheap", "Expensive"],
  ["A red flag", "A green flag"],
  ["Boring", "Chaotic"],
  ["Fake", "Genuine"],
  ["Embarrassing", "Impressive"],
  ["A want", "A need"],
  ["Old", "Modern"],
  ["Easy", "Impossible"],
  ["Polite", "Rude"],
  ["Childish", "Mature"],
  ["Forgettable", "Iconic"],
  ["Bad advice", "Good advice"],
  ["Guilty pleasure", "Actual quality"],
  ["Waste of money", "Worth every kwacha"],
];

// ─── ACT IT OUT (charades) ──────────────────────────────────────────────────

export const CHARADES = {
  easy: ["Brushing teeth", "Driving a car", "Taking a selfie", "Swimming", "Eating nshima", "Sleeping", "Playing football", "Washing clothes", "Riding a bike", "Answering a phone"],
  medium: ["Losing your keys", "A bad job interview", "Getting a haircut you hate", "Arguing with a minibus conductor", "Watching a horror film", "Trying to open a jar", "Being stuck in traffic", "Taking a group photo", "Assembling furniture", "Missing a bus"],
  hard: ["Pretending to enjoy a gift", "Explaining Wi-Fi to your grandmother", "Realising you sent the wrong message", "Being the only one who doesn't get the joke", "Waiting for exam results", "Trying to leave a party politely", "Meeting an ex unexpectedly", "Losing an argument you started", "Faking confidence", "Being caught in a lie"],
} as const;

// ─── MINUTE TO WIN IT ───────────────────────────────────────────────────────
// The app runs the timer and the scoreboard; the challenge is physical.
// Everything here uses what's already in a living room.

export type MinuteChallenge = { name: string; rules: string; needs: string };

export const MINUTE_CHALLENGES: MinuteChallenge[] = [
  { name: "Cup Stack", rules: "Build the tallest freestanding tower you can. Tallest at 60s wins.", needs: "Cups or containers" },
  { name: "Balance", rules: "Stand on one leg with your eyes closed. Last one standing wins.", needs: "Nothing" },
  { name: "Face Coin", rules: "Move a coin from your forehead to your mouth using only your face.", needs: "A coin" },
  { name: "Sock Sort", rules: "Match as many pairs of socks as you can in 60 seconds.", needs: "A pile of socks" },
  { name: "Paper Toss", rules: "Land as many paper balls in a bin from three metres.", needs: "Paper, a bin" },
  { name: "Alphabet Sprint", rules: "Name something in this room starting with each letter, A onwards. Furthest wins.", needs: "Nothing" },
  { name: "Don't Laugh", rules: "The room tries to make you laugh. Survive 60 seconds.", needs: "Nothing" },
  { name: "Phone Tower", rules: "Stack everyone's phones into the tallest tower without it falling.", needs: "Phones" },
  { name: "One Breath", rules: "Say the alphabet backwards in one breath. Furthest wins.", needs: "Nothing" },
  { name: "Blind Draw", rules: "Draw a portrait of the person opposite with your eyes closed. Room votes.", needs: "Paper, pen" },
  { name: "Spoon Race", rules: "Carry an object on a spoon across the room and back, fastest time.", needs: "A spoon, small object" },
  { name: "Statue", rules: "Hold a pose the room chooses for 60 seconds. Moving disqualifies you.", needs: "Nothing" },
];

// ─── CHAOS CARDS ────────────────────────────────────────────────────────────
// Random modifiers the host can drop on any round.

export const CHAOS_CARDS: string[] = [
  "Double points this round",
  "Swap scores with the person on your left",
  "This round is silent — no talking, at all",
  "Everyone must answer in the third person",
  "The person in last place picks who goes first, forever",
  "Whoever wins this round loses 100 points instead",
  "No names may be said aloud this round",
  "Everyone must stand for the entire round",
  "The leader plays this round with their eyes closed",
  "Steal 50 points from anyone you like",
  "Everyone shifts one seat to the left",
  "This round, last place wins",
  "Compliments only for the next five minutes",
  "The host must do whatever the room votes, once",
  "Everyone's score is rounded down to the nearest 100",
];

// ─── THE WHEEL ──────────────────────────────────────────────────────────────

export const WHEEL_SEGMENTS: string[] = [
  "+200 points",
  "Lose 100 points",
  "Swap with the leader",
  "Free pass token",
  "Pick a Chaos Card",
  "Everyone else loses 50",
  "Take a dare",
  "Answer a truth",
  "Nothing happens",
  "Double or nothing next round",
  "Steal 100 from anyone",
  "The room decides your fate",
];

// ─── EVIDENCE ───────────────────────────────────────────────────────────────
// Fired at random moments. Deliberately vague — the instruction is to
// capture whatever is actually happening, not to stage something.

export const EVIDENCE_PROMPTS: string[] = [
  "Two photos. Whatever is in front of you, right now.",
  "Two photos. Someone who doesn't know you're taking it.",
  "Two photos. The most boring thing in the room.",
  "Two photos. Whoever is closest to you.",
  "Two photos. Something nobody has noticed yet.",
  "Two photos. The state of the room, honestly.",
  "Two photos. Someone's hands.",
  "Two photos. Whatever is behind you.",
  "Two photos. The best and worst thing you can see.",
  "Two photos. Something that will make sense later.",
  "Two photos. Whoever is talking loudest.",
  "Two photos. A detail, not a person.",
  "Two photos. Whatever is on the table.",
  "Two photos. Someone losing.",
  "Two photos. The view from where you're sitting.",
  "Two photos. Anything at all — you have two minutes.",
];

// ─── MOST LIKELY TO — reserve deck ──────────────────────────────────────────
// The group wrote 14 of their own. These run after those.

export const MOST_LIKELY_TO: string[] = [
  "Most likely to be famous for something stupid",
  "Most likely to go to prison for a very boring crime",
  "Most likely to cry at their own birthday party",
  "Most likely to start an argument and then leave",
  "Most likely to marry someone nobody has met",
  "Most likely to become extremely rich",
  "Most likely to fake their own death",
  "Most likely to be late to their own wedding",
  "Most likely to become a completely different person in two years",
  "Most likely to survive an actual emergency",
  "Most likely to lie on a survey like this one",
  "Most likely to be running a scam right now",
  "Most likely to move abroad and never come back",
  "Most likely to be the last one still awake",
  "Most likely to forget someone's birthday every single year",
  "Most likely to end up on the news",
];
