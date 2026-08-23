#!/usr/bin/env node
// World events per year (issue #40). License-clean by construction:
//  1. candidates = linked article TITLES from the Events section of each enwiki
//     year page (facts + titles, not prose — no Wikipedia text is copied);
//  2. ranked by 2024 Wikimedia pageviews (global salience);
//  3. 3/year hand-selected + described in ORIGINAL text in SELECTED below.
// Run once to harvest/rank (cached in data/raw/events/) -> candidates.json;
// with SELECTED filled it also validates + writes site/public/data/events.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RAW = 'data/raw/events';
const PV = `${RAW}/pv`;
const OUT = 'site/public/data/events.json';
const YEARS = Array.from({ length: 101 }, (_, i) => 1926 + i);
const UA = 'YearAtlas/1.0 (https://github.com/seandavi/my-year-atlas; seandavi@gmail.com)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, ok404 = false) {
  for (let a = 0; a < 8; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return res.text();
      if (res.status === 404 && ok404) return null;
      console.error(`\n${res.status} (attempt ${a + 1}) ${url}`);
    } catch (e) {
      console.error(`\n${e.message} (attempt ${a + 1}) ${url}`);
    }
    await sleep(Math.min(3000 * 2 ** a, 60000)); // back off and continue
  }
  throw new Error(`retries exhausted ${url}`);
}

// ---- 1. year pages: Events-section wikitext -> candidate titles ------------
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const isJunk = (t) =>
  /^\d{1,4}(s| BC)?$/.test(t) || // bare years/decades
  new RegExp(`^(${MONTHS})( \\d{1,2})?$`).test(t) ||
  new RegExp(`^\\d{1,2} (${MONTHS})$`).test(t) ||
  t.includes(':') || t.length > 120; // namespaced links (File:, Category:, …)

function eventsSection(wikitext) {
  // level-2 "Events" heading up to the next level-2 heading
  const m = wikitext.match(/^==\s*Events\s*==\s*$([\s\S]*?)(?=^==[^=]|(?![\s\S]))/m);
  return m ? m[1] : '';
}

function candidates(wikitext) {
  // No per-year cap: a first-N cap truncates the year at ~February and loses
  // Apollo 11 / Sept 11 / Berlin Wall. ~26k unique titles total is affordable
  // at 10 req/s with the pool below, and every response is cached.
  const seen = new Set();
  for (const m of eventsSection(wikitext).matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]*)?\]\]/g)) {
    const t = m[1].trim();
    if (!isJunk(t)) seen.add(t);
  }
  return [...seen];
}

mkdirSync(PV, { recursive: true });
const wikitextByYear = {};
for (const y of YEARS) {
  const cache = `${RAW}/${y}.wikitext.json`;
  if (!existsSync(cache)) {
    process.stdout.write(`${y} `);
    const body = await get(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${y}&prop=wikitext&formatversion=2&format=json`,
    );
    writeFileSync(cache, body);
    await sleep(300);
  }
  wikitextByYear[y] = JSON.parse(readFileSync(cache, 'utf8')).parse.wikitext;
}

// ---- 2. rank by 2024 pageviews (cached per title; pool of 6 ≈ 10 req/s) ----
// The per-article endpoint wants the canonical DB title (first letter upper);
// a lowercase link like [[euro]] otherwise counts only the redirect's views.
const canon = (t) => t[0].toUpperCase() + t.slice(1);

async function fetchViews(title) {
  const file = `${PV}/${encodeURIComponent(title)}.json`;
  if (existsSync(file)) return;
  const t = encodeURIComponent(title.replaceAll(' ', '_'));
  const body = await get(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${t}/monthly/2024010100/2024123100`,
    true,
  );
  writeFileSync(file, body ?? '{"items":[]}');
  await sleep(400); // 6 workers × one request per ~400ms+latency ≈ 10 req/s aggregate
}

const views = (title) => {
  const items = JSON.parse(readFileSync(`${PV}/${encodeURIComponent(canon(title))}.json`, 'utf8')).items ?? [];
  return items.reduce((s, i) => s + i.views, 0);
};

const byYear = Object.fromEntries(YEARS.map((y) => [y, candidates(wikitextByYear[y])]));
const queue = [...new Set(Object.values(byYear).flat().map(canon))];
console.log(`${queue.length} unique titles to rank`);
let done = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let t; (t = queue.pop()); ) {
    await fetchViews(t);
    if (++done % 500 === 0) console.log(`${done} fetched, ${queue.length} left`);
  }
}));

const ranked = {};
for (const y of YEARS)
  ranked[y] = byYear[y].map((t) => [t, views(t)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
writeFileSync(`${RAW}/candidates.json`, JSON.stringify(ranked, null, 1));
console.log(`\n${RAW}/candidates.json written`);

// ---- 3. hand-curated selection (original text; see data/EVENTS_SOURCES.md) -
// Framing rule (SPEC §9 + issue #40): ≤1 war/disaster/atrocity per year;
// prefer firsts, science, culture, sport, exploration. Text is written from
// general knowledge of these events, never from the wiki prose (asserted below).
const SELECTED = {
  1926: [
    { t: "Robert Goddard launched the first liquid-fuel rocket", w: "liquid-fuel rocket" },
    { t: "A. A. Milne's Winnie-the-Pooh was published", w: "Winnie-the-Pooh (book)" },
    { t: "U.S. Route 66, the highway from Chicago to Los Angeles, was established", w: "U.S. Route 66" },
  ],
  1927: [
    { t: "Charles Lindbergh flew nonstop and alone from New York to Paris", w: "Spirit of St. Louis" },
    { t: "The Jazz Singer, the first feature film with synchronized dialogue, premiered", w: "The Jazz Singer" },
    { t: "The Mississippi River burst its levees in the most destructive US river flood on record", w: "Great Mississippi Flood of 1927" },
  ],
  1928: [
    { t: "Alexander Fleming discovered penicillin", w: "Penicillin" },
    { t: "Mickey Mouse debuted in the sound cartoon Steamboat Willie", w: "Steamboat Willie" },
    { t: "The Amsterdam Olympics included women's track and field for the first time", w: "1928 Summer Olympics" },
  ],
  1929: [
    { t: "US stock prices collapsed in October, setting off the Great Depression", w: "Wall Street Crash of 1929" },
    { t: "The first Academy Awards were presented in Los Angeles", w: "1st Academy Awards" },
    { t: "The Museum of Modern Art opened in New York", w: "Museum of Modern Art" },
  ],
  1930: [
    { t: "Uruguay hosted and won the first FIFA World Cup", w: "1930 FIFA World Cup" },
    { t: "Clyde Tombaugh discovered Pluto", w: "Pluto" },
    { t: "Gandhi led the Salt March against the British salt monopoly in India", w: "Salt March" },
  ],
  1931: [
    { t: "The Empire State Building opened as the world's tallest building", w: "Empire State Building" },
    { t: "Spain's Second Republic was proclaimed and King Alfonso XIII left the country", w: "Second Spanish Republic" },
    { t: "Central China's rivers flooded in one of the deadliest disasters ever recorded", w: "1931 China flood" },
  ],
  1932: [
    { t: "James Chadwick discovered the neutron", w: "neutron" },
    { t: "The Sydney Harbour Bridge opened", w: "Sydney Harbour Bridge" },
    { t: "Los Angeles hosted the Summer Olympics, introducing the first athletes' village", w: "1932 Summer Olympics" },
  ],
  1933: [
    { t: "Germany's Enabling Act handed Hitler's government the power to rule by decree", w: "Enabling Act of 1933" },
    { t: "The Twenty-first Amendment ended Prohibition in the United States", w: "Twenty-first Amendment to the United States Constitution" },
    { t: "King Kong premiered in New York", w: "King Kong (1933 film)" },
  ],
  1934: [
    { t: "Mao Zedong's Red Army set out on the Long March", w: "Long March" },
    { t: "The Dionne sisters became the first quintuplets known to survive infancy", w: "Dionne quintuplets" },
    { t: "The 'surgeon's photograph' made the Loch Ness Monster world-famous", w: "Loch Ness Monster" },
  ],
  1935: [
    { t: "The Social Security Act became US law", w: "Social Security Act" },
    { t: "Parker Brothers began selling the board game Monopoly", w: "Monopoly (game)" },
    { t: "Germany's Nuremberg Laws stripped Jews of citizenship", w: "Nuremberg Laws" },
  ],
  1936: [
    { t: "Jesse Owens won four gold medals at the Berlin Olympics", w: "1936 Summer Olympics" },
    { t: "Edward VIII abdicated the British throne to marry Wallis Simpson", w: "Edward VIII abdication crisis" },
    { t: "The Spanish Civil War began with a military rising against the Republic", w: "Spanish Civil War" },
  ],
  1937: [
    { t: "The Golden Gate Bridge opened in San Francisco", w: "Golden Gate Bridge" },
    { t: "Snow White and the Seven Dwarfs, Disney's first animated feature, premiered", w: "Snow White and the Seven Dwarfs (1937 film)" },
    { t: "The airship Hindenburg burned while landing at Lakehurst, New Jersey", w: "Hindenburg disaster" },
  ],
  1938: [
    { t: "Otto Hahn and Fritz Strassmann split the uranium atom", w: "nuclear fission" },
    { t: "Superman first appeared in Action Comics No. 1", w: "Action Comics 1" },
    { t: "Nazi mobs burned synagogues and Jewish shops across Germany on Kristallnacht", w: "Kristallnacht" },
  ],
  1939: [
    { t: "Germany invaded Poland, starting the Second World War in Europe", w: "Invasion of Poland" },
    { t: "The New York World's Fair opened, promising 'the world of tomorrow'", w: "1939 New York World's Fair" },
    { t: "Gone with the Wind premiered in Atlanta", w: "Gone with the Wind (film)" },
  ],
  1940: [
    { t: "The Royal Air Force held off the Luftwaffe in the Battle of Britain", w: "Battle of Britain" },
    { t: "Four teenagers found the prehistoric cave paintings of Lascaux", w: "Lascaux" },
    { t: "Disney's Fantasia premiered, setting animation to classical music", w: "Fantasia (1940 film)" },
  ],
  1941: [
    { t: "Japan attacked Pearl Harbor and the United States entered World War II", w: "Attack on Pearl Harbor" },
    { t: "Orson Welles's Citizen Kane premiered", w: "Citizen Kane" },
    { t: "Joe DiMaggio hit in 56 straight games, a record that still stands", w: "Joe DiMaggio's 56-game hitting streak" },
  ],
  1942: [
    { t: "The US Navy sank four Japanese carriers at the Battle of Midway", w: "Battle of Midway" },
    { t: "Enrico Fermi's team achieved the first controlled nuclear chain reaction", w: "Enrico Fermi" },
    { t: "Casablanca premiered in New York", w: "Casablanca (film)" },
  ],
  1943: [
    { t: "The German army surrendered at Stalingrad, a turning point of the war", w: "Battle of Stalingrad" },
    { t: "Jacques Cousteau and Emile Gagnan tested the Aqua-Lung, the first modern scuba gear", w: "Aqua-lung" },
    { t: "Albert Hofmann discovered the psychedelic effects of LSD", w: "LSD" },
  ],
  1944: [
    { t: "Allied troops landed on the Normandy beaches on D-Day", w: "Normandy landings" },
    { t: "The Bretton Woods conference designed the postwar monetary system", w: "Bretton Woods Conference" },
    { t: "The Education Act made secondary schooling free in England and Wales", w: "Education Act 1944" },
  ],
  1945: [
    { t: "The United States dropped atomic bombs on Hiroshima and Nagasaki", w: "Atomic bombings of Hiroshima and Nagasaki" },
    { t: "Fifty nations signed the United Nations Charter in San Francisco", w: "United Nations Charter" },
    { t: "UNESCO was founded to promote education, science and culture", w: "UNESCO" },
  ],
  1946: [
    { t: "ENIAC, the first general-purpose electronic computer, was unveiled", w: "ENIAC" },
    { t: "The Nuremberg tribunal delivered its verdicts on Nazi war crimes", w: "Nuremberg trials" },
    { t: "The modern bikini debuted at a Paris poolside fashion show", w: "bikini" },
  ],
  1947: [
    { t: "British India was partitioned into independent India and Pakistan", w: "Partition of India" },
    { t: "Chuck Yeager flew the Bell X-1 faster than sound, the first supersonic flight", w: "Bell X-1" },
    { t: "Bell Labs researchers demonstrated the first transistor", w: "transistor" },
  ],
  1948: [
    { t: "Israel declared independence as British rule in Palestine ended", w: "Israeli Declaration of Independence" },
    { t: "The UN adopted the Universal Declaration of Human Rights", w: "Universal Declaration of Human Rights" },
    { t: "London hosted the first Summer Olympics in twelve years", w: "1948 Summer Olympics" },
  ],
  1949: [
    { t: "Twelve nations signed the North Atlantic Treaty, creating NATO", w: "NATO" },
    { t: "Mao Zedong proclaimed the People's Republic of China", w: "People's Republic of China" },
    { t: "George Orwell's Nineteen Eighty-Four was published", w: "Nineteen Eighty-Four" },
  ],
  1950: [
    { t: "North Korean forces crossed the 38th parallel, starting the Korean War", w: "Korean War" },
    { t: "Uruguay beat hosts Brazil in the deciding match of the World Cup", w: "1950 FIFA World Cup" },
    { t: "Charles Schulz's comic strip Peanuts first appeared", w: "Peanuts" },
  ],
  1951: [
    { t: "UNIVAC I, the first commercial computer built in the US, was delivered", w: "UNIVAC I" },
    { t: "I Love Lucy premiered on CBS", w: "I Love Lucy" },
    { t: "Six European nations formed the Coal and Steel Community, forerunner of the EU", w: "European Coal and Steel Community" },
  ],
  1952: [
    { t: "Elizabeth II became queen on the death of her father, George VI", w: "Elizabeth II" },
    { t: "The United States tested the first hydrogen bomb at Enewetak Atoll", w: "hydrogen bomb" },
    { t: "Helsinki hosted the Summer Olympics, where Emil Zatopek won three golds", w: "1952 Summer Olympics" },
  ],
  1953: [
    { t: "Watson and Crick proposed the double-helix structure of DNA", w: "double helix" },
    { t: "Edmund Hillary and Tenzing Norgay reached the summit of Everest", w: "1953 British Mount Everest expedition" },
    { t: "An armistice halted the fighting in the Korean War", w: "Korean Armistice Agreement" },
  ],
  1954: [
    { t: "Roger Bannister ran the first sub-four-minute mile", w: "sub-four minute mile" },
    { t: "The US Supreme Court outlawed racial segregation in public schools", w: "Brown v. Board of Education" },
    { t: "The original Godzilla premiered in Japan", w: "Godzilla (1954 film)" },
  ],
  1955: [
    { t: "The Salk polio vaccine was declared safe and effective", w: "Salk polio vaccine" },
    { t: "Disneyland opened in Anaheim, California", w: "Disneyland" },
    { t: "Rosa Parks was arrested and the Montgomery bus boycott began", w: "Montgomery bus boycott" },
  ],
  1956: [
    { t: "The first Eurovision Song Contest was held in Lugano, Switzerland", w: "Eurovision Song Contest" },
    { t: "The first transatlantic telephone cable entered service", w: "transatlantic telephone cable" },
    { t: "A popular uprising in Hungary was suppressed by Soviet forces", w: "Hungarian Revolution of 1956" },
  ],
  1957: [
    { t: "The Soviet Union launched Sputnik 1, the first artificial satellite", w: "Sputnik 1" },
    { t: "The Treaty of Rome created the European Economic Community", w: "Treaty of Rome" },
    { t: "Aboard Sputnik 2, the dog Laika became the first living creature in orbit", w: "Laika" },
  ],
  1958: [
    { t: "The United States created NASA", w: "NASA" },
    { t: "Seventeen-year-old Pele led Brazil to its first World Cup title", w: "1958 FIFA World Cup" },
    { t: "Jack Kilby demonstrated the first integrated circuit", w: "integrated circuit" },
  ],
  1959: [
    { t: "Fidel Castro's rebels took Havana and toppled the Batista government", w: "Fidel Castro" },
    { t: "Luna 3 sent back the first photographs of the Moon's far side", w: "Luna 3" },
    { t: "The Barbie doll debuted at the New York toy fair", w: "Barbie" },
  ],
  1960: [
    { t: "Abebe Bikila ran the Olympic marathon barefoot to win Ethiopia's first gold", w: "1960 Summer Olympic Games" },
    { t: "Theodore Maiman operated the first working laser", w: "laser" },
    { t: "The strongest earthquake ever recorded struck southern Chile", w: "1960 Valdivia earthquake" },
  ],
  1961: [
    { t: "Yuri Gagarin orbited Earth aboard Vostok 1, the first human in space", w: "Vostok 1" },
    { t: "East Germany sealed the border and began building the Berlin Wall", w: "Berlin Wall" },
    { t: "Amnesty International was founded in London", w: "Amnesty International" },
  ],
  1962: [
    { t: "The Cuban Missile Crisis brought the US and USSR to the brink of nuclear war", w: "Cuban Missile Crisis" },
    { t: "Telstar relayed the first live television pictures across the Atlantic", w: "Telstar" },
    { t: "Pope John XXIII opened the Second Vatican Council", w: "Second Vatican Council" },
  ],
  1963: [
    { t: "President John F. Kennedy was assassinated in Dallas", w: "Assassination of John F. Kennedy" },
    { t: "Martin Luther King Jr. delivered his 'I Have a Dream' speech in Washington", w: "I Have a Dream" },
    { t: "Valentina Tereshkova became the first woman in space", w: "Vostok 6" },
  ],
  1964: [
    { t: "The Civil Rights Act outlawed segregation and discrimination in the US", w: "Civil Rights Act of 1964" },
    { t: "Tokyo hosted the first Olympic Games held in Asia", w: "1964 Summer Olympics" },
    { t: "Beatlemania swept America after the Beatles' Ed Sullivan debut", w: "The Beatles" },
  ],
  1965: [
    { t: "Alexei Leonov made the first spacewalk from Voskhod 2", w: "Voskhod 2" },
    { t: "The Voting Rights Act banned racial barriers to voting in the US", w: "Voting Rights Act of 1965" },
    { t: "Intelsat I, the first commercial communications satellite, launched", w: "Intelsat I" },
  ],
  1966: [
    { t: "England won the World Cup at Wembley", w: "1966 FIFA World Cup" },
    { t: "Luna 9 made the first soft landing on the Moon and sent photos", w: "Luna 9" },
    { t: "Mao launched the Cultural Revolution in China", w: "Cultural Revolution" },
  ],
  1967: [
    { t: "Christiaan Barnard performed the first human heart transplant", w: "Christiaan Barnard" },
    { t: "The Beatles released Sgt. Pepper's Lonely Hearts Club Band", w: "Sgt. Pepper's Lonely Hearts Club Band" },
    { t: "Israel and its Arab neighbours fought the Six-Day War", w: "Six-Day War" },
  ],
  1968: [
    { t: "Apollo 8 carried the first crew around the Moon", w: "Apollo 8" },
    { t: "Martin Luther King Jr. was assassinated in Memphis", w: "Assassination of Martin Luther King Jr." },
    { t: "Tommie Smith and John Carlos raised their fists on the Olympic podium", w: "1968 Olympics Black Power salute" },
  ],
  1969: [
    { t: "Apollo 11 landed and Neil Armstrong walked on the Moon", w: "Apollo 11" },
    { t: "Nearly half a million people gathered at the Woodstock festival", w: "Woodstock" },
    { t: "The first ARPANET link, ancestor of the internet, went live", w: "ARPANET" },
  ],
  1970: [
    { t: "Apollo 13's crew returned safely after an oxygen tank exploded", w: "Apollo 13" },
    { t: "The Beatles broke up", w: "Break-up of the Beatles" },
    { t: "A cyclone struck East Pakistan, the deadliest storm ever recorded", w: "1970 Bhola cyclone" },
  ],
  1971: [
    { t: "The first microprocessor, the Intel 4004, went on sale", w: "Intel 4004" },
    { t: "Apollo 15's crew drove the first rover on the Moon", w: "Apollo 15" },
    { t: "Bangladesh won independence from Pakistan after a liberation war", w: "Bangladesh Liberation War" },
  ],
  1972: [
    { t: "Apollo 17's crew were the last people to walk on the Moon", w: "Apollo 17" },
    { t: "Atari released Pong, the first hit video game", w: "Pong" },
    { t: "Eleven Israeli team members were killed at the Munich Olympics", w: "Munich massacre" },
  ],
  1973: [
    { t: "Arab oil producers cut exports and world oil prices roughly quadrupled", w: "OPEC" },
    { t: "The Sydney Opera House opened", w: "Sydney Opera House" },
    { t: "The United States launched Skylab, its first space station", w: "Skylab" },
  ],
  1974: [
    { t: "Richard Nixon resigned the presidency over Watergate", w: "Watergate scandal" },
    { t: "The 3.2-million-year-old 'Lucy' skeleton was unearthed in Ethiopia", w: "Lucy (hominid)" },
    { t: "ABBA won Eurovision with 'Waterloo'", w: "Waterloo (ABBA song)" },
  ],
  1975: [
    { t: "Saigon fell and the Vietnam War ended", w: "Fall of Saigon" },
    { t: "Bill Gates and Paul Allen founded Microsoft", w: "Microsoft" },
    { t: "US and Soviet spacecraft docked in orbit in the Apollo-Soyuz mission", w: "Apollo–Soyuz Test Project" },
  ],
  1976: [
    { t: "Steve Jobs and Steve Wozniak founded Apple", w: "Apple Computer" },
    { t: "Viking 1 made the first successful landing on Mars", w: "Viking 1" },
    { t: "Nadia Comaneci scored the first perfect 10 in Olympic gymnastics", w: "1976 Summer Olympics" },
  ],
  1977: [
    { t: "Star Wars opened in cinemas", w: "Star Wars (film)" },
    { t: "Voyagers 1 and 2 set off on their tour of the outer planets", w: "Voyager program" },
    { t: "The world's last natural case of smallpox was recorded", w: "smallpox" },
  ],
  1978: [
    { t: "Louise Brown, the first baby conceived by IVF, was born", w: "test tube baby" },
    { t: "Egypt and Israel reached the Camp David Accords", w: "Camp David Accords" },
    { t: "Karol Wojtyla became Pope John Paul II, the first Polish pope", w: "Pope John Paul II" },
  ],
  1979: [
    { t: "The Iranian Revolution overthrew the Shah and created an Islamic republic", w: "Iranian Revolution" },
    { t: "Margaret Thatcher became Britain's first female prime minister", w: "Margaret Thatcher" },
    { t: "Sony introduced the Walkman portable cassette player", w: "Sony Walkman" },
  ],
  1980: [
    { t: "The WHO declared smallpox eradicated, a first for any human disease", w: "smallpox" },
    { t: "Pac-Man arrived in arcades", w: "Pac-Man" },
    { t: "The Solidarity trade union was founded at the Gdansk shipyard", w: "Solidarity (Polish trade union)" },
  ],
  1981: [
    { t: "The Space Shuttle Columbia flew the first shuttle mission", w: "STS-1" },
    { t: "IBM released its first personal computer, the IBM PC", w: "IBM PC" },
    { t: "US doctors reported the first cases of what became known as AIDS", w: "AIDS" },
  ],
  1982: [
    { t: "Britain and Argentina fought a ten-week war over the Falkland Islands", w: "Falklands War" },
    { t: "The first compact discs and CD players went on sale", w: "compact disc" },
    { t: "Italy won the World Cup in Spain", w: "1982 FIFA World Cup" },
  ],
  1983: [
    { t: "Sally Ride became the first American woman in space", w: "STS-7" },
    { t: "The ARPANET switched to TCP/IP, the protocol that still runs the internet", w: "Internet protocol suite" },
    { t: "M*A*S*H's finale became the most-watched US TV episode ever", w: "Goodbye, Farewell and Amen" },
  ],
  1984: [
    { t: "Apple introduced the Macintosh", w: "Macintosh 128K" },
    { t: "A gas leak in Bhopal, India became history's worst industrial disaster", w: "Bhopal disaster" },
    { t: "Carl Lewis won four golds at the Los Angeles Olympics", w: "1984 Summer Olympics" },
  ],
  1985: [
    { t: "Live Aid concerts in London and Philadelphia played to a global audience", w: "Live Aid" },
    { t: "Robert Ballard's team found the wreck of the Titanic", w: "Wreck of the RMS Titanic" },
    { t: "British scientists reported the ozone hole over Antarctica", w: "Ozone depletion" },
  ],
  1986: [
    { t: "The Chernobyl nuclear reactor exploded, spreading fallout across Europe", w: "Chernobyl disaster" },
    { t: "The Soviet Union launched the Mir space station", w: "Mir" },
    { t: "Diego Maradona's Argentina won the World Cup in Mexico", w: "1986 FIFA World Cup final" },
  ],
  1987: [
    { t: "The Simpsons debuted as shorts on The Tracey Ullman Show", w: "The Simpsons" },
    { t: "Stock markets crashed worldwide on Black Monday", w: "Black Monday (1987)" },
    { t: "World population passed five billion", w: "World population" },
  ],
  1988: [
    { t: "Seoul hosted the Summer Olympics", w: "1988 Summer Olympics" },
    { t: "The first transatlantic fiber-optic cable entered service", w: "optical fiber" },
    { t: "A bomb destroyed Pan Am Flight 103 over Lockerbie, Scotland", w: "Pan Am Flight 103" },
  ],
  1989: [
    { t: "The Berlin Wall was opened and East Germans streamed west", w: "Fall of the Berlin Wall" },
    { t: "Tim Berners-Lee proposed the World Wide Web at CERN", w: "World Wide Web" },
    { t: "Chinese troops crushed the Tiananmen Square protests", w: "1989 Tiananmen Square protests and massacre" },
  ],
  1990: [
    { t: "The Hubble Space Telescope reached orbit", w: "Hubble Space Telescope" },
    { t: "Nelson Mandela walked free after 27 years in prison", w: "Nelson Mandela" },
    { t: "Germany reunified after 45 years of division", w: "German reunification" },
  ],
  1991: [
    { t: "Russia, Ukraine and Belarus signed the accords dissolving the Soviet Union", w: "Belovezha Accords" },
    { t: "The World Wide Web went public with the first website at CERN", w: "World Wide Web" },
    { t: "A US-led coalition drove Iraqi forces out of Kuwait", w: "Gulf War" },
  ],
  1992: [
    { t: "European leaders signed the Maastricht Treaty", w: "Maastricht Treaty" },
    { t: "Barcelona hosted the Olympics and the US basketball Dream Team", w: "1992 Summer Olympics" },
    { t: "The Rio Earth Summit produced the first global climate treaty", w: "Earth Summit" },
  ],
  1993: [
    { t: "The European Union came into being as the Maastricht Treaty took effect", w: "European Union" },
    { t: "Israel and the PLO signed the Oslo Accord in Washington", w: "Oslo I Accord" },
    { t: "Jurassic Park brought computer-generated dinosaurs to the screen", w: "Jurassic Park (film)" },
  ],
  1994: [
    { t: "South Africans of all races voted and Nelson Mandela became president", w: "1994 South African general election" },
    { t: "The Channel Tunnel linked Britain and France", w: "Channel Tunnel" },
    { t: "Some 800,000 people were killed in the Rwandan genocide", w: "Rwandan genocide" },
  ],
  1995: [
    { t: "Microsoft launched Windows 95", w: "Windows 95" },
    { t: "Astronomers found 51 Pegasi b, the first planet around a Sun-like star", w: "51 Pegasi b" },
    { t: "A truck bomb destroyed the Oklahoma City federal building, killing 168", w: "Oklahoma City bombing" },
  ],
  1996: [
    { t: "Dolly the sheep, the first mammal cloned from an adult cell, was born", w: "Dolly the sheep" },
    { t: "Atlanta hosted the centennial Summer Olympics", w: "1996 Summer Olympics" },
    { t: "The Taliban took Kabul and imposed their rule on Afghanistan", w: "Taliban" },
  ],
  1997: [
    { t: "Britain returned Hong Kong to China", w: "Transfer of sovereignty over Hong Kong" },
    { t: "IBM's Deep Blue beat world chess champion Garry Kasparov in a match", w: "Deep Blue (chess computer)" },
    { t: "The first Harry Potter book was published", w: "Harry Potter and the Philosopher's Stone" },
  ],
  1998: [
    { t: "Larry Page and Sergey Brin founded Google", w: "Google" },
    { t: "The first modules of the International Space Station were joined in orbit", w: "International Space Station" },
    { t: "Northern Ireland's peace deal, the Good Friday Agreement, was signed", w: "Good Friday Agreement" },
  ],
  1999: [
    { t: "Eleven EU countries adopted the euro for electronic payments", w: "euro" },
    { t: "The Sopranos premiered on HBO", w: "The Sopranos" },
    { t: "NATO bombed Yugoslavia during the Kosovo War", w: "Kosovo War" },
  ],
  2000: [
    { t: "Scientists announced the first draft of the human genome", w: "Human Genome Project" },
    { t: "Sydney hosted the Summer Olympics and Cathy Freeman won the 400m", w: "2000 Summer Olympics" },
    { t: "The first resident crew moved into the International Space Station", w: "Expedition 1" },
  ],
  2001: [
    { t: "The September 11 attacks destroyed the World Trade Center's twin towers", w: "September 11 attacks" },
    { t: "Wikipedia went online", w: "Wikipedia" },
    { t: "Apple released the first iPod", w: "iPod" },
  ],
  2002: [
    { t: "Euro notes and coins entered circulation in twelve countries", w: "Euro" },
    { t: "Japan and South Korea co-hosted the World Cup, won by Brazil", w: "2002 FIFA World Cup" },
    { t: "The International Criminal Court was established in The Hague", w: "International Criminal Court" },
  ],
  2003: [
    { t: "The Human Genome Project was completed", w: "Human Genome Project" },
    { t: "Concorde made its last commercial flight", w: "Concorde" },
    { t: "A US-led coalition invaded Iraq and toppled Saddam Hussein", w: "2003 invasion of Iraq" },
  ],
  2004: [
    { t: "SpaceShipOne became the first private craft to reach space", w: "SpaceShipOne" },
    { t: "The Olympics returned to Athens, their ancient home", w: "2004 Summer Olympics" },
    { t: "An Indian Ocean tsunami killed some 230,000 people in fourteen countries", w: "2004 Indian Ocean earthquake and tsunami" },
  ],
  2005: [
    { t: "YouTube went online", w: "YouTube" },
    { t: "The Kyoto Protocol on greenhouse gases came into force", w: "Kyoto Protocol" },
    { t: "Hurricane Katrina flooded New Orleans", w: "Hurricane Katrina" },
  ],
  2006: [
    { t: "Astronomers reclassified Pluto as a dwarf planet", w: "Pluto" },
    { t: "Italy won the World Cup in Germany", w: "2006 FIFA World Cup" },
    { t: "Nintendo released the Wii", w: "Wii" },
  ],
  2007: [
    { t: "Apple released the first iPhone", w: "iPhone (1st generation)" },
    { t: "The UN climate panel reported that warming is unequivocal and human-driven", w: "IPCC Fourth Assessment Report" },
    { t: "US subprime mortgage losses set off a global financial crisis", w: "Subprime mortgage crisis" },
  ],
  2008: [
    { t: "Barack Obama was elected the first Black US president", w: "2008 United States presidential election" },
    { t: "Usain Bolt broke the 100m and 200m world records at the Beijing Olympics", w: "2008 Summer Olympics" },
    { t: "Lehman Brothers collapsed in the largest bankruptcy in US history", w: "Lehman Brothers" },
  ],
  2009: [
    { t: "The Bitcoin network launched", w: "Bitcoin" },
    { t: "US Airways Flight 1549 ditched in the Hudson River and all 155 aboard survived", w: "US Airways Flight 1549" },
    { t: "The H1N1 swine flu pandemic spread worldwide", w: "2009 flu pandemic" },
  ],
  2010: [
    { t: "Apple released the iPad", w: "iPad" },
    { t: "The Burj Khalifa opened in Dubai as the world's tallest building", w: "Burj Khalifa" },
    { t: "An earthquake devastated Port-au-Prince, Haiti", w: "2010 Haiti earthquake" },
  ],
  2011: [
    { t: "A tsunami struck northeast Japan and crippled the Fukushima nuclear plant", w: "2011 Tōhoku earthquake and tsunami" },
    { t: "World population passed seven billion", w: "Day of Seven Billion" },
    { t: "The Space Shuttle flew its final mission", w: "STS-135" },
  ],
  2012: [
    { t: "The Curiosity rover landed in Gale Crater on Mars", w: "Curiosity (rover)" },
    { t: "CERN announced the discovery of the Higgs boson", w: "Higgs boson" },
    { t: "Gangnam Style became the first video with a billion YouTube views", w: "Gangnam Style" },
  ],
  2013: [
    { t: "Cardinal Bergoglio of Argentina became Pope Francis", w: "Pope Francis" },
    { t: "Edward Snowden revealed mass surveillance by the NSA", w: "Edward Snowden" },
    { t: "A meteor exploded over Chelyabinsk, injuring more than a thousand people", w: "Chelyabinsk meteor" },
  ],
  2014: [
    { t: "Rosetta's Philae probe made the first landing on a comet", w: "Rosetta spacecraft" },
    { t: "Germany won the World Cup in Brazil", w: "2014 FIFA World Cup" },
    { t: "The largest Ebola epidemic on record swept West Africa", w: "West African Ebola virus epidemic" },
  ],
  2015: [
    { t: "Nearly 200 nations adopted the Paris climate agreement", w: "Paris Agreement" },
    { t: "New Horizons made the first flyby of Pluto", w: "New Horizons" },
    { t: "Coordinated attacks in Paris killed 130 people", w: "November 2015 Paris attacks" },
  ],
  2016: [
    { t: "Britain voted to leave the European Union", w: "2016 United Kingdom European Union membership referendum" },
    { t: "Rio de Janeiro hosted South America's first Olympics", w: "2016 Summer Olympics" },
    { t: "Donald Trump was elected US president", w: "2016 United States presidential election" },
  ],
  2017: [
    { t: "Astronomers spotted the first known interstellar object, Oumuamua", w: "ʻOumuamua" },
    { t: "A total solar eclipse crossed the United States from coast to coast", w: "Solar eclipse of August 21, 2017" },
    { t: "Millions joined Women's Marches the day after Trump's inauguration", w: "2017 Women's March" },
  ],
  2018: [
    { t: "Twelve boys and their football coach were rescued from a flooded Thai cave", w: "Tham Luang cave rescue" },
    { t: "NASA launched the Parker Solar Probe to skim the Sun's corona", w: "Parker Solar Probe" },
    { t: "France won the World Cup in Russia", w: "2018 FIFA World Cup" },
  ],
  2019: [
    { t: "Astronomers unveiled the first image of a black hole", w: "Event Horizon Telescope" },
    { t: "Millions of students joined a global climate strike", w: "September 2019 climate strike" },
    { t: "Fire destroyed the roof and spire of Notre-Dame cathedral in Paris", w: "Notre-Dame fire" },
  ],
  2020: [
    { t: "The COVID-19 pandemic shut down much of the world", w: "COVID-19 pandemic" },
    { t: "SpaceX flew astronauts to the ISS, the first commercial crewed flight", w: "Crew Dragon Demo-2" },
    { t: "The killing of George Floyd sparked protests worldwide", w: "George Floyd protests" },
  ],
  2021: [
    { t: "Mass COVID-19 vaccination campaigns rolled out worldwide", w: "COVID-19 vaccine" },
    { t: "NASA's Ingenuity made the first powered flight on another planet", w: "Ingenuity (helicopter)" },
    { t: "The postponed Tokyo Olympics were held largely without spectators", w: "2020 Summer Olympics" },
  ],
  2022: [
    { t: "Russia launched a full-scale invasion of Ukraine", w: "2022 Russian invasion of Ukraine" },
    { t: "The James Webb Space Telescope delivered its first images", w: "James Webb Space Telescope" },
    { t: "OpenAI released ChatGPT", w: "ChatGPT" },
  ],
  2023: [
    { t: "India's Chandrayaan-3 made the first landing near the Moon's south pole", w: "Chandrayaan-3" },
    { t: "OpenAI's GPT-4 led a wave of generative AI adoption", w: "GPT-4" },
    { t: "Hamas attacked Israel and the Gaza war began", w: "October 7 attacks" },
  ],
  2024: [
    { t: "Paris hosted the Summer Olympics", w: "2024 Summer Olympics" },
    { t: "A total solar eclipse swept across North America", w: "Solar eclipse of April 8, 2024" },
    { t: "Donald Trump won a second, non-consecutive term as US president", w: "2024 United States presidential election" },
  ],
  2025: [
    { t: "Robert Prevost became Pope Leo XIV, the first American pope", w: "Pope Leo XIV" },
    { t: "Sweeping new US tariffs disrupted global trade", w: "Liberation Day tariffs" },
    { t: "Firefly's Blue Ghost made the first fully successful commercial Moon landing", w: "Firefly Aerospace" },
  ],
  2026: [
    { t: "Milan and Cortina d'Ampezzo hosted the Winter Olympics", w: "2026 Winter Olympics" },
    { t: "The United States, Canada and Mexico co-hosted the FIFA World Cup", w: "2026 FIFA World Cup" },
  ],
};

// ---- 4. validate + emit ----------------------------------------------------
if (Object.keys(SELECTED).length === 0) {
  console.log('SELECTED is empty — harvest done, curation pending.');
  process.exit(0);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const out = {};
for (const y of YEARS) {
  const entries = SELECTED[y] ?? [];
  if (y <= 2025 && entries.length !== 3) throw new Error(`${y}: ${entries.length} entries, want 3`);
  const wiki = norm(wikitextByYear[y]);
  const cand = new Set(candidates(wikitextByYear[y]));
  for (const { t, w } of entries) {
    if (t.length > 110) throw new Error(`${y}: text >110 chars: ${t}`);
    // no-copying check: no 10-word run of our text may appear in the wikitext
    const words = norm(t).split(' ');
    for (let i = 0; i + 10 <= words.length; i++)
      if (wiki.includes(words.slice(i, i + 10).join(' ')))
        throw new Error(`${y}: 10-word overlap with wikitext: ${t}`);
    if (!cand.has(w.replaceAll('_', ' ')))
      console.warn(`note: ${y} "${w}" not in that year's candidate list`);
  }
  out[y] = entries.map(({ t, w }) => ({ t, w: w.replaceAll(' ', '_') }));
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`${OUT}: ${Object.keys(out).length} years, ${(JSON.stringify(out).length / 1024).toFixed(0)}KB`);
