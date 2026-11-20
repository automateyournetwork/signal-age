# Signal Age · First playable specification

## The pitch

**As the communications chief of a civilization whose cities grow on their own, choose the right technology to meet the demand that growth creates, and learn the tradeoffs of range, speed, and capacity.**

The player is the **Messenger-General** of a growing civilization, drawn as a top-down map of settlements (Age of Empires meets SimCity). **The player never builds or places cities.** Settlements grow by themselves along a scripted historical timeline: a hamlet becomes a village, then a town, a capital, a metropolis. As they grow, they spread farther apart, and they need to send more and richer messages. The player's only job is to keep communications up with that growth. Each round shows the **demand** the growth has created, as a **message request**: who needs to talk to whom, how far apart they are, what kind of message it is, and how soon it must arrive. The player chooses which communication technology to build or use from those their era has unlocked. A correct decision lights up the link between the settlements and delivers the message in time; an incorrect decision shows the message arriving late, garbled, or not at all, with an explanation of which constraint failed. The session ends when the player has completed all six rounds and reaches the civilization summary, having advanced through three eras.

## Who this is for

- **Learner:** network engineers, students, and curious newcomers who use networks every day but have not thought about *why* each generation of communication technology replaced the last.
- **Assumed knowledge:** none. Terms such as range, latency, and capacity are taught in the briefings.
- **What the briefing teaches:** the three properties every communication link trades off, and how to compare them against a request:
  - **Message class**, what the link can carry: *alert*, *text*, *live voice*, or *data*.
  - **Reach**, how far one link spans.
  - **Delivery time**, distance divided by effective speed, compared with the deadline.
- **Why interaction helps:** players tend to assume the newest or "fastest" technology is always best. The game makes visible that the right choice depends on the request. A smoke beacon beats a horse relay for a 25 km warning, and a satellite link adds latency that fiber does not.
- **Session target:** 5–10 minutes for a first playthrough, with unlimited thinking time.

## Learning outcomes and evidence

| ID | After playing, the learner can… | The game asks them to… | Evidence of success |
| --- | --- | --- | --- |
| LO1 | Name what each early technology can and cannot carry (alert vs. text) and its reach | Pick a Level 1 medium (voice, drum, beacon, courier, horse relay) that fits a request | Selects the feasible option in both Level 1 rounds, and can say which constraint rules out each other option |
| LO2 | Compute delivery time (distance ÷ speed) and compare it with a deadline | Choose between mid-era options (optical telegraph, electric telegraph, telephone) where several are feasible and the difference is class or time | Selects the correct option in both Level 2 rounds; the feedback shows the arithmetic |
| LO3 | Compare deployment cost against population, topology, and capacity, and place each wireless generation on the ladder of coverage vs. capacity | Choose between fiber/cable, a wireless tier from 2G to beamformed fixed wireless, and LEO or geostationary satellite for sparse, rural, mobile, and dense areas | Selects the correct option in both Level 3 rounds and can say why fiber wins in dense areas while wireless or LEO wins in sparse, flat ones |

## The technical model

- **Rule being taught:** a medium is **feasible** for a request only if all five hold (rule 5 applies to every request):
  1. its **message class** is at least as capable as the request needs (alert < text < live voice < data);
  2. the request's **distance ≤ the medium's reach** (a single link; chains and relays are not modeled in v1);
  3. **delivery time = distance ÷ effective speed + fixed latency ≤ the deadline** (exactly equal counts as on time);
  4. **effective build time ≤ the request's lead time**, the time the growing settlement can wait before the demand arrives (exactly equal counts as ready). Infrastructure takes time to develop: a technology can fit every other constraint and still be ready too late.
  5. **capacity ≥ demand**: in Levels 1 and 2, the medium's **circuits** (simultaneous calls or 64 kbps channels) ≥ the circuits the request needs. Every Level 1–2 request carries a circuits value: alert and text requests need 1, and single-channel media carry 1 (see the circuits note below the capacity table). In Level 3, capacity is checked through per-user speed and tower or density rules, below.

  **Plant versus technology:** a medium's build time and cost are the sum of (1) the **physical plant** it needs, such as copper cable, ducts, fiber, or tower sites, **unless that plant already exists** in the request's existing infrastructure, and (2) the **technology** installed on it (equipment, switching, radios). A faster or higher-rate technology on the same plant costs more but **does not take longer to build**. The correct answer is the feasible medium with the lowest total cost.

  The correct answer is the **feasible medium with the lowest build cost**. Costs are distinct in v1; a cost tie is an authoring error. Era gating: Level 1 and 2 rounds offer every medium unlocked so far. Level 3 rounds offer only Level 3 media; earlier media appear in the tech panel for comparison but are not offered or graded, because they have no service-area rules.
- **Context:** a simplified, **game-model** version of communications history. Values are rounded, documented model values chosen to be defensible orders of magnitude, not claims about any specific historical system. Physical limits (the speed of light, the geostationary orbit altitude of about 35,786 km) are computed from their real values.
- **Assumptions:** each request is a single point-to-point link; the media and costs for the round are visible; the settlement already has the staff to operate whatever it builds.
- **Excluded behavior:** multi-hop chains and relay stations, congestion, queuing, error rates, weather, cost over time, security and encryption, and the political and economic history of each technology.
- **Authoritative references:** gather during **clarify** and record in the data file with title, URL, section, and the claim each supports. Needed claims:
  - signal speed in optical fiber (refractive index about 1.46, so roughly two-thirds of c);
  - geostationary altitude and the resulting minimum round trip;
  - historical anchors for the optical and electric telegraph, the telephone, and relay courier speeds;
  - the standard rates: the 64 kbps voice channel, T1, T3, and OC-3, OC-12 and OC-48.

  Every other value, including the Level 3 cost formulas, tier values, the 10% active-user share and the density cap, may ship labeled as a game-model value (decided 2026-11-17).

Tell the learner about these boundaries in plain language. Each briefing states that figures are simplified model values.

### Model values for v1 (to be confirmed during clarify)

| Medium | Era | Class | Reach per link | Effective speed | Build time (plant + technology) | Cost (plant + technology) |
| --- | --- | --- | --- | --- | --- | --- |
| Spoken word / shout | 1 | live voice | 0.1 km | instant | 0 months | 1 |
| Signal drum | 1 | alert | 5 km | instant | 1 month | 2 |
| Smoke beacon | 1 | alert | 30 km | instant | 1 month | 3 |
| Foot courier | 1 | text | unlimited | 40 km/day | 1 month | 4 |
| Horse relay | 1 | text | unlimited | 200 km/day | 6 months | 8 |
| Optical telegraph (semaphore) | 2 | text | 200 km | 200 km/h | 24 months | 12 |
| Electric telegraph | 2 | text | unlimited | instant | 36 months (36 + 0) | 17 (15 + 2) |
| Telephone line | 2 | live voice | unlimited | instant | 48 months (36 + 12) | 25 (15 + 10) |
| Analog carrier trunk | 2 | live voice | unlimited | instant | 42 months (36 + 6) | 30 (15 + 15) |
| T1 (DS1) | 2 | data | unlimited | about 200,000 km/s | 39 months (36 + 3) | 35 (15 + 20) |
| T3 (DS3) | 2 | data | unlimited | about 200,000 km/s | 51 months (48 + 3) | 45 (25 + 20) |
| SONET OC-3 | 2 | data | unlimited | about 200,000 km/s | 51 months (48 + 3) | 55 (25 + 30) |
| SONET OC-12 | 2 | data | unlimited | about 200,000 km/s | 51 months (48 + 3) | 70 (25 + 45) |
| SONET OC-48 | 2 | data | unlimited | about 200,000 km/s | 51 months (48 + 3) | 90 (25 + 65) |
| Ethernet over fiber / cable (the upgrade path from SONET) | 3 | data | route-based | about 200,000 km/s | 51 months (48 + 3) | formula (below) |
| Digital cellular (2G) | 3 | data | tower coverage | about 300,000 km/s | 24 months (18 + 6) | formula (below) |
| Mobile broadband (3G) | 3 | data | tower coverage | about 300,000 km/s | 24 months (18 + 6) | formula (below) |
| LTE broadband (4G) | 3 | data | tower coverage | about 300,000 km/s | 24 months (18 + 6) | formula (below) |
| Mid-band 5G | 3 | data | tower coverage | about 300,000 km/s | 24 months (18 + 6) | formula (below) |
| Interference-cancelling beamformed fixed wireless | 3 | data | node coverage | about 300,000 km/s | 24 months (18 + 6) | formula (below) |
| Low-earth-orbit (LEO) satellite | 3 | data | area coverage | up-and-down path only: about 1,100 km (about 550 km altitude), about 4 ms | 36 months | formula (below) |
| Geostationary satellite | 3 | data | area coverage | up-and-down path only: about 71,572 km, about 239 ms | 120 months | formula (below) |

### Plant versus technology (build time, cost, and reuse)

Building a link has two separate parts. The **physical plant** is the cable, ducts, fiber, or tower sites in the ground, and it is slow to build. The **technology** is the equipment lit on that plant, and it is quick. A higher SONET rate or a faster Ethernet on the same plant costs more but takes **no longer to build**.

| Plant | What it is | Cost (Level 2 / Level 3) | Build time |
| --- | --- | --- | --- |
| Copper plant | Twisted-pair or telegraph wire between the places | 15 / not used | 36 months |
| Ducts and rights-of-way | Conduit, poles, and permits | 10 / 1.5 per route km | 30 months |
| Fiber cable | Fiber pulled through ducts (needs ducts) | 15 / 3.5 per route km | 18 months |
| Tower sites | A site with tower, power, and backhaul | n/a / 8 per tower | 18 months |
| Semaphore towers | Hilltop optical telegraph stations | 10 / not used | 24 months |

Ducts plus fiber cable total 25 and 48 months at Level 2, and 5 per route km and 48 months at Level 3. Technology adds a fixed provisioning time: telegraph, none; telephone switching, 12 months; analog carrier, 6; T1, T3, every SONET rate, and Ethernet over fiber, 3; radio equipment on every wireless tier, 6. Technology costs: electric telegraph 2, optical telegraph 2, telephone 10, analog carrier 15, T1 20, T3 20, OC-3 30, OC-12 45, OC-48 65; Level 3 Ethernet equipment is 0.005 per person; wireless radio equipment per tower is 2, 4, 7, 17, and 12 for 2G, 3G, 4G, 5G, and fixed wireless. Level 1 media have no reusable plant; their build time covers organizing people, stations, and training.

**Existing infrastructure.** Each request lists the plant already in the ground (copper plant, ducts, dark fiber, lit SONET fiber, existing tower sites), authored from the historical script and never from the player's earlier choices. Existing plant counts as built: its cost and build time are zero for that medium.

- **Dark fiber** means ducts and fiber cable both exist, so fiber-based media pay only for technology.
- **Lit SONET fiber** also means dark fiber exists, plus working node sites and power, so fiber-based technology costs are **halved**. This is the **upgrade path**: Ethernet over fiber on an installed SONET route replaces the end equipment and keeps the fiber, which is why it lowers cost later.
- **Existing tower sites** are a count; the request gives the number already standing, and new sites are needed only beyond it.

Plant and technology costs and times are computed in whole numbers (cost in ten-thousandths of a cost unit, so per-person rates such as 0.005 and their halves stay exact) so equality and ties are exact.

Hand-checked Level 2 examples (voice, 300 km, deadline 1 second, 20 circuits, lead time 60 months unless stated):

- **Nothing installed:** analog carrier fails capacity (12 < 20); **T1 is correct at 35** (39 months); T3 costs 45 (51 months).
- **Copper plant installed:** T1 pays technology only: **20, 3 months, correct**; T3 still 45.
- **Dark fiber installed:** T3 pays technology only: **20, 3 months, correct**; T1 still 35 (39 months), though it has plenty of circuits for 20.
- **Copper and dark fiber both installed:** T1 and T3 both cost 20: a **cost tie, an authoring error**.
- **1,000 circuits, dark fiber installed:** T3 fails (672 < 1,000); **OC-3 is correct at 30, 3 months**; OC-12 costs 45 and OC-48 65, with **the same 3 months**: higher rate, same build time.
- **Lit SONET installed, 1,000 circuits:** OC-3 costs 30 × 50% = 15, still 3 months.

Hand-checked Level 3 example (route 60 km, area 2,000 km², population 10,000, 40 Mbps each, fixed, flat; demand 40,000 Mbps):

- **Nothing installed:** Ethernet over fiber (1.5 + 3.5) × 60 + 50 = 350 (51 months); fixed wireless needs 10 towers: 8 × 10 + 12 × 10 = 200 (24 months); 5G 14 towers: 8 × 14 + 17 × 14 = 350. **Fixed wireless is correct.**
- **Ducts only:** fiber cable 3.5 × 60 = 210 + 50 = 260 > 200. **Fixed wireless stays correct.**
- **Dark fiber installed:** Ethernet costs only technology: 50, 3 months. **Ethernet over fiber is correct.**
- **Lit SONET installed:** equipment halves to 25. **Ethernet over fiber is correct**: the SONET-to-Ethernet upgrade.
- **10 tower sites already standing, no fiber:** fixed wireless pays radio only: 12 × 10 = 120, 6 months. **Fixed wireless is correct**, ahead of fiber at 350.

### Latency and capacity scores (shown for every medium, every round)

Every round shows **all media unlocked so far, including earlier eras**, each with a **latency** and a **capacity**, so the player can watch the whole ladder improve from smoke signals to near-gigabit wireless. Scores are **display-only**: the evaluator grades by the five feasibility rules and cost, and never by a score. The scores are derived by one deterministic function from the same values the evaluator uses.

- **Latency** is the delivery time for *this round's* request distance, shown in the most natural unit: milliseconds, seconds, minutes, hours, days, weeks (from 14 days), or months (from 60 days, counted as 30 days). A foot courier over 1,000 km shows **about 3.6 weeks**; a build-time-limited long haul can show months. Near-instant media show "under 1 second".
- **Latency score (0–10, one decimal)** = clamp(7 − log₁₀(seconds), 0, 10), and 10 for near-instant. Each tenfold slowdown costs one point: 1 ms scores 10, 1 s scores 7, 3 hours about 3.0, 25 days about 0.7.
- **Capacity** is the sustained information rate in bits per second, scaled to a readable unit (bps, kbps, Mbps, Gbps). Signal-style media use an authored rate. **Couriers use payload ÷ transit time** for this request (the courier's payload is a game-model value), so a courier's capacity falls as the trip gets longer, which is the point of the comparison. Level 3 media show their peak per-user speed.
- **Capacity score (0–10, one decimal)** = clamp(log₁₀(bps) + 1, 0, 10): 1 bps scores 1, 64 kbps about 5.8, 100 Mbps 9, 1 Gbps and above 10.
- **Band label:** each score is shown beside the readable unit its value is displayed in (for example "hours" or "kbps"), so the unit boundaries above are the band boundaries. Labels are display-only.

| Medium | Capacity (game-model value) | Notes |
| --- | --- | --- |
| Spoken word / shout | about 40 bps | Human speech carries a few tens of bits per second of information |
| Signal drum | about 1 bps | A few coded signals per minute |
| Smoke beacon | about 0.05 bps | One alert per several minutes |
| Foot courier | payload 240,000 bits (about 30 KB of writing) per trip | Capacity = payload ÷ transit time |
| Horse relay | payload 1,000,000 bits (about 125 KB of writing) per trip | Capacity = payload ÷ transit time |
| Optical telegraph | about 0.5 bps | Coded symbols relayed between towers |
| Electric telegraph | about 15 bps | Skilled operator keying code |
| Telephone line | 64 kbps (1 circuit) | One digital voice channel |
| Analog carrier trunk | 12 circuits, about 0.77 Mbps equivalent | Multiplexed analog voice channels |
| T1 | 1.544 Mbps (24 circuits) | 24 × 64 kbps channels plus framing |
| T3 | 44.736 Mbps (672 circuits) | 28 T1s multiplexed |
| SONET OC-3 / OC-12 / OC-48 | 155.52 Mbps (2,016 circuits) / 622.08 Mbps (8,064) / 2.488 Gbps (32,256) | Standard optical carrier rates |
| Fiber / cable | 1 Gbps per user | Drop speed; far more on the backbone |
| Wireless tiers | 0.2, 10, 100, 500, and 800 Mbps per user | From the wireless ladder below |
| LEO satellite | 100 Mbps per user | Cap used for feasibility |
| Geostationary satellite | 25 Mbps per user | Cap used for feasibility |

All capacities are game-model values unless sourced. Where a figure has a standard (such as the 64 kbps voice channel), cite it.

**Circuits (graded in Levels 1–2; game-model rule confirmed 2026-11-17):** every Level 1–2 request carries a circuits-needed value, and alert and text requests need 1. The spoken word, signal drum, smoke beacon, foot courier, horse relay, optical telegraph, electric telegraph and telephone line each carry 1 circuit; the analog carrier trunk 12; T1 24; T3 672; OC-3 2,016; OC-12 8,064; OC-48 32,256.

### Level 3 deployment cost model (population, topology, and capacity)

In the final era, a request describes a **service area** instead of a single pair of points: **population**, **area (km²)**, **route distance (km)** to the nearest backbone, **per-user speed needed (Mbps)**, whether the users must be **mobile**, whether the terrain is **flat**, and optionally a **delivery deadline**. Density (population ÷ area) is derived. **Peak demand = population × per-user Mbps × 10%** (game assumption: one in ten users is active at once). Topology and capacity decide the economics: flat, sparse areas favor wireless or low-orbit satellite, and dense areas favor fiber/cable.

**The wireless ladder.** Each generation of wireless is its own medium, with a coverage area per tower, a capacity per tower, a peak speed per user, and a tower cost. Older tiers cover more area per tower but carry far less; the newest fixed-wireless tier delivers near-gigabit per user over long distances, but only to fixed locations. No product or company names are used; each tier represents a class of technology and what it supports.

| Wireless tier | Coverage per tower (km²) | Capacity per tower (Mbps) | Peak per-user speed (Mbps) | Mobile users | Cost per tower |
| --- | --- | --- | --- | --- | --- |
| Digital cellular (2G) | 1,000 | 1 | 0.2 | Yes | 10 (site 8 + radio 2) |
| Mobile broadband (3G) | 800 | 20 | 10 | Yes | 12 (8 + 4) |
| LTE broadband (4G) | 600 | 300 | 100 | Yes | 15 (8 + 7) |
| Mid-band 5G | 150 | 3,000 | 500 | Yes | 25 (8 + 17) |
| Interference-cancelling beamformed fixed wireless | 700 | 4,000 | 800 | **No (fixed only)** | 20 (8 + 12) |

Total deployment cost for Level 3 media (game-model values, to be confirmed in clarify):

| Medium | Total cost formula | Extra feasibility rules |
| --- | --- | --- |
| Ethernet over fiber / cable | plant + technology: ducts 1.5 × route km (unless ducts or dark fiber exist) + fiber 3.5 × route km (unless dark fiber exists) + 0.005 × population (halved on lit SONET) | Not for mobile users; flat terrain not required |
| Wireless tier | site cost 8 × new sites + radio cost × towers, with new sites = max(0, towers − existing tower sites); where towers = max(ceil(area ÷ coverage), ceil(peak demand ÷ capacity)) | Tier's peak per-user speed ≥ the request; mobile requests need a mobile tier; terrain must be flat |
| LEO satellite | 100 + 0.2 × population | Density ≤ 50 people/km²; per-user speed ≤ 100 Mbps; fixed or mobile |
| Geostationary satellite | 150 + 0.5 × population | Density ≤ 50 people/km²; per-user speed ≤ 25 Mbps |

Hand-checked examples (peak demand = population × per-user × 10%):

- **Remote and sparse** (route 400 km, area 40,000 km², population 1,500, 5 Mbps each, fixed, flat): demand 750 Mbps. Fiber 2,007.5; 3G 12 × 50 = 600; 4G 15 × 67 = 1,005; fixed wireless 20 × 58 = 1,160; 5G 25 × 267 = 6,675; 2G infeasible (0.2 < 5); **LEO 100 + 300 = 400, correct**.
- **Rural flat** (route 150 km, area 5,000 km², population 4,000, 25 Mbps each, fixed, flat): demand 10,000 Mbps. Fiber 770; 3G infeasible (10 < 25); 4G 15 × 34 = 510; 5G 25 × 34 = 850; LEO 900; **fixed wireless 20 × 8 = 160, correct** (towers = max(ceil(5,000 ÷ 700) = 8, ceil(10,000 ÷ 4,000) = 3)).
- **Same area, mobile users required:** fiber and fixed wireless are excluded. **4G at 510 is correct**, ahead of 5G at 850 and LEO at 900.
- **Dense city** (route 10 km, area 50 km², population 200,000, 100 Mbps each, fixed): demand 2,000,000 Mbps. **Fiber 50 + 1,000 = 1,050, correct**; fixed wireless 20 × 500 = 10,000; 5G 25 × 667 = 16,675; LEO excluded (density 4,000 > 50).

Level 1 and 2 requests use the fixed costs and single-link reach above. Level 3 uses the area model, and the single-link reach rule is replaced by the coverage formulas. When a Level 3 request has a deadline, ground media (fiber, wireless) use the route distance for delivery time, and satellites use the up-and-down path only.

Build times are game-model values for the *project* time to stand up one link, not historical claims. The player makes one choice per request, and the build time is checked against that request's lead time.

Delivery for instant media is treated as zero for the purposes of the deadline. Satellite delivery time is the up-and-down path only, at the speed of light: geostationary 2 × 35,786 km ≈ 71,572 km, about 239 ms; LEO about 1,100 km, about 4 ms. The ground distance between the endpoints is not added, because the signal goes up to the satellite and back down rather than along the ground. For endpoints far apart each leg is longer than the altitude, so this is a floor, which is the point the game teaches (decided 2026-11-17).

## The repeatable game loop

1. **Brief:** introduce one concept (a class, a reach limit, or a delivery-time calculation) with a worked example different from the challenge.
2. **Inspect:** show the **growth snapshot** (each settlement's name and size tier for this point in the timeline, and why demand has risen, such as "the village is now a market town") and the **request card** (from, to, distance, message class, delivery deadline, and **lead time**, how long until the demand arrives; **circuits needed** for voice and data requests in Level 2; and the **existing infrastructure** already in the ground, such as copper telephone plant, ducts, dark fiber, lit SONET fiber, or tower sites), and the **tech panel** for every unlocked medium (class, reach, speed, build time, cost, **latency and capacity with their scores**) for every medium unlocked so far, with all decision-relevant values visible.
3. **Choose:** the player selects one medium and explicitly submits.
4. **Explain:** display the delivery result on the map and a per-medium table showing which constraint each rejected medium fails, the computed delivery time, and the cost comparison.
5. **Retry or advance:** a wrong answer leaves the round playable; a correct answer enables Next. Next plays a short **"years pass"** transition: the timeline advances to the next round's year, settlements grow to their new tiers, and a caption names what changed (for example, "Year 1790: the village is now a market town"). It can be skipped, and the same caption appears as text when motion is reduced.
6. **Reflect:** the level summary shows completed rounds, valid attempts, and assistance used, and announces the **era advance** that unlocks the next level's technologies.

**Worked interaction (Level 1, Round 1):** the player sees a hill fort **25 km** from the village. Raiders are approaching. The request is an **alert** that must arrive within **1 hour**, and the growing village has **12 months** before raiders become a regular threat. The player chooses the **horse relay** because it is fast. Feedback: *"Horse relay carries text and reaches 25 km, but at 200 km/day it needs 3 hours. That's more than your 1-hour deadline. Look for a medium that can carry an alert quickly."* The player then chooses the **smoke beacon**, which has a 30 km reach and can carry an alert, so the delivery time is effectively zero. It is correct and cheaper (cost 3 vs. 8). The map lights up and the village rings its warning bell.

## Required stories and acceptance criteria

### US1 · Make and understand a decision — P1

As a learner, I want to apply the rule to visible evidence and understand the result.

- **AC1:** Given a fresh session, when I start, then I see the first briefing before answering a challenge.
- **AC2:** Given Level 1 Round 1 (alert, 25 km, 1 hour deadline), when I submit **Smoke beacon**, then the round is marked correct, the link lights up, and an explanation of why it is feasible and cheapest appears.
- **AC3:** Given that challenge, when I submit **Horse relay**, then feedback identifies the missed deadline (3 hours vs. 1 hour), completion stays unchanged, and I can retry.
- **AC4:** Given no selection, when I submit, then input guidance appears and attempts/completion remain unchanged.

### US2 · Learn from help and finish the game — P1

As a learner, I want help when stuck and a clear view of my progress.

- **AC5:** A hint first explains the method (check class, then reach, then delivery time, then capacity, then build time and cost). Further help can show a worked solution; assistance is recorded without marking the round complete.
- **AC6:** Each valid submission counts as one attempt until the round is solved. Correct submission completes it once; repeated submission after success has no effect.
- **AC7:** A level completes after both of its rounds are solved. Next opens the following round or level, and finishing a level shows the era-advance screen that unlocks the next set of media; the final round opens a civilization summary.
- **AC8:** Restart asks for confirmation, then clears the current session and returns to the first briefing. Cancel preserves the session.

### US3 · Play with accessible controls — P1

As a keyboard user, I want to inspect the challenge, choose, submit, get help, and advance without a mouse.

- **AC9:** All core controls have visible focus and accessible names; keyboard interaction reaches every core action.
- **AC13:** After a correct round, Next shows the years-pass transition before the next round, level, or era screen. It names the new year and each settlement whose tier changed, can be skipped with a key or button, and with reduced motion appears instantly as text. It never delays feedback or controls.
- **AC10:** Correct/incorrect feedback includes text, remains available to read, and is announced to assistive technology. Motion can be reduced without losing information. The map has a text equivalent (a list of settlements, distances, and the request).
- **AC11:** Every round shows a latency and a capacity, each with its 0–10 score, for every unlocked medium including earlier eras. Values match the documented formulas, units are readable (including days, weeks, and months for couriers), and no score affects grading.
- **AC12:** Each round lists its existing infrastructure. Every medium shows its cost and build time split into plant and technology, with plant already built shown as zero. A higher tier on the same plant costs more but never takes longer.

## Version-one content

**Three levels, two rounds per level, six rounds total** (one era per level). Each round uses one new example and the same core mechanic: choose the feasible, cheapest medium.

| Level | Era and new concept | Prerequisite | Misconception to expose |
| --- | --- | --- | --- |
| 1 · Voices and Couriers | Speech, drums, beacons, written messages, and relays: **message class and reach** (LO1) | None | "The fastest-sounding option is always best," when a slow carrier can't meet a deadline or a short-range one can't reach |
| 2 · Wires | Optical and electric telegraph, the telephone, and the telecom carrier ladder (T1, T3, SONET): **delivery time, class, circuits, and plant versus technology cost and time** (LO2) | Level 1 | "Voice is better than text," when a text-only request doesn't need a phone; and treating "instant" and "fast" as the same |
| 3 · Networks | Fiber/cable, the wireless ladder (2G → near-gigabit fixed wireless), and LEO satellite: **population, topology, capacity, and deployment cost** (LO3) | Level 2 | "The newest technology is always best," when each wireless generation trades coverage for capacity, fixed wireless can't serve mobile users, and dense cities favor fiber |

**City growth (authored, not player-controlled):** each round's data carries a size tier for each settlement shown (hamlet → village → town → city → metropolis), and the request's distance and message class follow from it. Larger tiers sit farther from their neighbors and need richer message classes: hamlets mostly need alerts, towns need text, cities need live voice, and metropolises need data. Tiers only go up as the player moves through the timeline. They never depend on the player's choices, so the same level always presents the same growth. Growth sets the request, and the evaluator still grades only by the rule in the technical model.

**Progression:** sequential on first playthrough; retry without penalty. Completion requires a correct submission in every round. Hints remain available. No points, lives, timer, leaderboard, or streak mechanic in v1. Era advance is a reward for completing a level, not a currency.

**Session behavior:** progress is held for the current page session; reload starts again. Saving across reloads is a stretch feature and must be specified before it is added.

## Cases the implementation must satisfy

Write these before generating code. Expected results are derived by hand from the model table, then independently checked by a teammate.

| Case | Input state | Player action | Expected result | Why / source |
| --- | --- | --- | --- | --- |
| Correct | Alert, 25 km, deadline 1 h, lead time 12 months, Level 1 media | Smoke beacon | Correct | Class alert ok; 25 ≤ 30 km reach; instant ≤ 1 h; 1 month ≤ 12 months; cost 3 is the lowest feasible |
| Plausible mistake | Same request | Horse relay | Incorrect: late | Text carries an alert, 25 ≤ unlimited reach, 6 ≤ 12 months, but 25 ÷ 200 km/day = 3 h > 1 h |
| Build time too long | Text, 100 km, deadline 5 days, lead time 3 months, Level 1 and 2 media | Electric telegraph | Incorrect: not ready | Telegraph meets class, reach, and delivery, but its 36-month build time > 3 months. Foot courier is feasible (100 ÷ 40 km/day = 2.5 days ≤ 5 days; 1 month ≤ 3 months) and cheapest, so it is the correct answer |
| Build time boundary | Text, 100 km, deadline 24 h, lead time exactly 6 months | Horse relay | Correct | Build time equal to lead time counts as ready; 100 ÷ 200 km/day = 12 h ≤ 24 h |
| Boundary (reach) | Alert, exactly 30 km, deadline 1 h | Smoke beacon | Correct | Distance equal to reach is allowed |
| Boundary (reach) | Alert, 31 km, deadline 1 h | Smoke beacon | Incorrect: out of reach | 31 > 30 km reach (chains not modeled) |
| Boundary (deadline) | Text, 200 km, deadline exactly 24 h, Level 1 media | Horse relay | Correct | 200 ÷ 200 km/day = 24 h, equal counts as on time; foot courier needs 120 h |
| Latency floor | Data, 15,000 km, deadline 100 ms | Geostationary satellite | Incorrect: late | about 239 ms satellite path exceeds 100 ms; fiber about 75 ms (15,000 ÷ 200,000 km/s) is feasible |
| Plant: nothing installed | Voice, 300 km, 20 circuits, lead 60 months | T1 | Correct | 35 (39 months) < T3 45; analog carrier fails capacity (12 < 20) |
| Plant: copper installed | Same, copper plant exists | T1 | Correct | Technology only: 20, 3 months < T3 45 |
| Plant: dark fiber installed | Same, dark fiber exists | T3 | Correct | 20, 3 months < T1 35 |
| Plant: cost tie | Same, copper and dark fiber both exist | Open round | Content error | T1 and T3 both cost 20; authoring error |
| Same plant, higher rate | 1,000 circuits, lead exactly 3 months, dark fiber exists | SONET OC-12 | Incorrect: feasible but costlier | OC-3 30 is correct; OC-12 45 takes the same 3 months |
| Lead-time boundary | Same request | SONET OC-3 | Correct | 3 months ≤ 3 months |
| Capacity too low | Voice, 300 km, 40 circuits, lead 60 months | T1 | Incorrect: capacity | 24 < 40 circuits; T3 (672) is correct |
| Upgrade in place | Level 3 example above, lit SONET on the route | Ethernet over fiber | Correct | 25 < fixed wireless 200 |
| Existing tower sites | Same area, 10 tower sites standing, no fiber | Fixed wireless | Correct | 120 < fiber 350 |
| Score: courier latency | Text, 1,000 km, foot courier | Inspect only | Latency about 25 days (about 3.6 weeks), latency score about 0.7 | 1,000 ÷ 40 km/day = 25 days = 2,160,000 s; 7 − log₁₀(2,160,000) ≈ 0.7 |
| Score: telephone capacity | Telephone | Inspect only | 64 kbps, capacity score about 5.8 | log₁₀(64,000) + 1 ≈ 5.8 |
| Score: horse relay | Horse relay, 25 km | Inspect only | Latency 3 hours, score about 3.0; capacity about 93 bps, score about 3.0 | 25 ÷ 200 km/day = 10,800 s; 1,000,000 ÷ 10,800 ≈ 92.6 bps |
| Score: geostationary vs. fiber | 15,000 km | Inspect only | Fiber about 75 ms, score about 8.1; geostationary about 239 ms, score about 7.6 | Scores shown; they never change which answer is correct |
| Topology: sparse | Route 400 km, area 40,000 km², population 1,500, 5 Mbps, fixed, flat | LEO satellite | Correct | LEO 400 < 3G 600 < 4G 1,005 < fixed wireless 1,160 < fiber 2,007.5 |
| Topology: rural flat | Route 150 km, area 5,000 km², population 4,000, 25 Mbps, fixed, flat | Fixed wireless | Correct | 160 < 4G 510 < 5G 850 < LEO 900; 3G fails speed (10 < 25) |
| Mobile requirement | Same rural request, mobile users | Fixed wireless | Incorrect: not mobile | Fixed-only tier excluded; 4G (510) is correct |
| Topology: dense | Route 10 km, area 50 km², population 200,000, 100 Mbps, fixed | Fiber | Correct | Fiber 1,050 < fixed wireless 10,000; LEO excluded by density cap |
| Wireless tier speed | Any request needing 25 Mbps | 3G | Incorrect: too slow | Peak per-user speed 10 < 25 Mbps; the newer tier is needed |
| Density boundary | Area 100 km², population exactly 5,000 (density 50), flat | LEO satellite | Feasible | Density equal to the cap is allowed; correct only if its cost is lowest |
| Unsupported content | Request whose two cheapest feasible media share a cost, or a medium with a missing field | Open round | Visible content error; no grading or progress | Authoring error, not learner failure |

Add additional cases for every shipped round before implementation.

## Experience direction

- **Visual metaphor:** a living top-down map where settlements visibly grow (a few huts become a walled town, then a skyline) as the timeline advances, with a "demand" indicator showing why the next request exists. A "message runner" icon, signal pulse, or wire animates along the link when a medium is chosen. A timeline bar across the top fills as eras advance.
- **Years pass:** between rounds, a timeline sweeps from one year to the next while the settlements visibly grow; the player sees why the next demand exists before it appears.
- **One memorable moment:** the chosen link is drawn between two settlements and the message traverses it at a pace proportional to its real delivery time; a late message visibly arrives after the deadline marker.
- **Always visible:** request card (from, to, distance, class, deadline), each medium's class, reach, speed, and cost, and the current era.
- **Feedback voice:** patient and specific; explain the observed choice before offering the next step.
- **Layout:** map and request first, tech panel next, explanation beside or below it. Don't hide technical values behind hover-only interactions.

## Non-goals

No user accounts, multiplayer, backend, live infrastructure access, runtime AI, leaderboard, or level editor. No city building, placement, or management: cities grow only on the authored historical script. No resource economy, combat, or fog of war in v1. No simulation of multi-hop routing, relay stations, congestion, or real network protocols. Visual polish must fit the existing mechanic.

**Stretch ideas (not v1):** additional eras (written language and art, postal systems, coaxial and microwave trunks, switching, packet networks, Wi-Fi); multi-hop chains with relay costs; a persistent civilization map across sessions.

## Decisions (all resolved 2026-11-17)

Recorded in full in `specs/001-signal-age/spec.md` (Clarifications).

- Single-hop links only; no relay stations in v1.
- The best answer is the feasible medium with the lowest total build cost: one number, no operating cost; a tie is an authoring error.
- Sources: the physical limits, historical anchors and standard rates under Authoritative references are cited; every other value ships labeled as a game-model value.
- Speech and written language appear in the Level 1 briefing only; there is no Level 0.
- The player does not build cities; growth is scripted history, shown with a short, skippable years-pass transition plus the changed growth snapshot.
- The wireless ladder stays inside Level 3; no Level 4.
- The Level 3 cost formulas, tier capacities and density cap are accepted as labeled game-model values.
- Every Level 1–2 request carries a circuits demand (alert and text need 1); SONET ring protection is briefing-only and not graded; T1 and above carry class `data`.
- Keep SONET OC-12 and the analog carrier trunk. The plant-versus-technology model is accepted.
- Keep the 0–10 logarithmic scores, each shown beside its value's unit as the band label.
- Message class is a strict ordering (alert < text < live voice < data).
- Level 3 offers only Level 3 media; earlier media are shown for comparison only.
- Level 3 deadlines are optional; ground media use the route distance and satellites the up-and-down path only.
- Costs are computed in ten-thousandths of a cost unit.

## Release evidence

All required acceptance criteria must have a recorded result. All six rounds and their explanations must be checked against the references. A teammate must complete the core flow using only the keyboard. The README must describe implemented behavior, exact run/test commands, and any remaining limits.
