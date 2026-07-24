# JagrukSetu Complaint Taxonomy v1

**Purpose:** Implementation-ready, India-oriented complaint taxonomy for civic, regulatory, police, emergency, welfare, transport, and administrative workflows.

**Version:** 1.0
**Prepared:** 23 July 2026
**Coverage:** 17 primary categories, 20 subcategories per category, 340 total subcategories, and 19 primary workflow types.

---

## 1. Design principles

1. **Category is not the final route.** Final routing must consider location, jurisdiction, asset ownership, authority, department, office, durable role, and active assignment.
2. **Civic and police workflows remain separate.** Law-and-order, crime, child-protection, domestic-violence, and emergency records must not enter the ordinary public complaint feed.
3. **Emergency reports are redirected.** An active emergency must show the jurisdiction's official emergency contact flow and must not imply that a JagrukSetu ticket provides emergency dispatch.
4. **Sensitive complaints default to private.** Alleged crimes, minors, domestic violence, sexual offences, missing persons, mental-health crises, self-harm risk, trafficking, and protected-person data must be restricted.
5. **Every category is configurable by jurisdiction.** Cities may enable, disable, rename, translate, or reroute categories without changing the global taxonomy.
6. **Officer names are optional routing metadata.** The durable routing target is authority → office → department → role; current people are versioned assignments.
7. **Unverified categories remain non-routable.** The taxonomy may be complete while a city's routing crosswalk remains pending verification.

---

## 2. Taxonomy hierarchy

```text
Primary category
  → Subcategory
    → Optional issue variant
      → Routing profile
        → Authority / department / office / role / SLA / evidence / visibility
```

---

## 3. Primary workflow types

| Code                       | Type                                      | Operational meaning                                                                                                                                                  |
| -------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAINTENANCE`              | Infrastructure maintenance                | Repair, restoration, cleaning, replacement, or preventive upkeep.                                                                                                    |
| `SERVICE_FAILURE`          | Public-service failure                    | A scheduled, expected, or contracted public service was not delivered.                                                                                               |
| `PUBLIC_HEALTH`            | Public-health hazard                      | Disease, contamination, hygiene, vector, sanitation, or food-safety risk.                                                                                            |
| `ENVIRONMENTAL`            | Environmental nuisance or harm            | Air, water, noise, waste, tree, wildlife, or ecological impact.                                                                                                      |
| `ENFORCEMENT`              | Civic or regulatory enforcement           | Possible illegal use, obstruction, construction, dumping, licensing, or land-use violation.                                                                          |
| `SAFETY_HAZARD`            | Public-safety hazard                      | A condition that may cause injury, collision, collapse, electrocution, or property damage.                                                                           |
| `EMERGENCY`                | Active emergency                          | Immediate danger requiring emergency-service redirection rather than ordinary complaint handling.                                                                    |
| `FACILITY_SERVICE`         | Public-facility service issue             | A government or civic facility is inaccessible, damaged, unhygienic, or not operating.                                                                               |
| `LAW_AND_ORDER`            | Non-emergency law-and-order matter        | Public order, nuisance, suspicious activity, harassment, or police assistance.                                                                                       |
| `CRIME_REPORT`             | Crime report                              | A suspected or completed offence requiring police intake and evidence protection.                                                                                    |
| `CYBER_INCIDENT`           | Cybercrime or digital fraud               | Online fraud, account misuse, identity theft, cyber harassment, or digital evidence.                                                                                 |
| `WELFARE_PROTECTION`       | Protection and social welfare             | Support for vulnerable persons, abuse, neglect, shelter, rehabilitation, or welfare access.                                                                          |
| `ADMINISTRATIVE_GRIEVANCE` | Administrative or records grievance       | Certificates, taxes, bills, official records, applications, delays, or public information.                                                                           |
| `CONSUMER_REGULATORY`      | Consumer, trade, and licensing complaint  | Commercial licensing, pricing, weights, food establishments, markets, or regulated activity.                                                                         |
| `TRANSPORT_SERVICE`        | Public-transport service complaint        | Service availability, ticketing, accessibility, staff conduct, stops, stations, or passenger safety.                                                                 |
| `DISASTER_RESPONSE`        | Disaster response and relief              | Evacuation, shelter, relief, rescue, and post-disaster support.                                                                                                      |
| `INFORMATION_ACCESS`       | Information and digital-access issue      | Government portals, public information, language, accessibility, and digital-service access.                                                                         |
| `ANIMAL_WELFARE`           | Animal welfare and control                | Injured, abandoned, aggressive, stray, or improperly handled animals.                                                                                                |
| `ANTI_CORRUPTION`          | Anti-corruption and public-integrity case | Alleged bribery, misuse of public office, public-fund diversion, procurement manipulation, or another integrity violation requiring confidential independent intake. |

---

## 4. Primary-category summary

| Code  | Primary category                                                  | Typical authority family                                                                                                            | Subcategories |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------: |
| `SWM` | Waste, Cleanliness & Sanitation                                   | Municipal solid-waste, sanitation, public-health, ward operations                                                                   |            20 |
| `RDS` | Roads, Footpaths & Public Infrastructure                          | Municipal roads, engineering, PWD, highway or asset-owning agency                                                                   |            20 |
| `DRN` | Drainage, Sewerage & Flooding                                     | Storm-water drains, sewerage operations, hydraulic or disaster-management units                                                     |            20 |
| `WTR` | Water Supply & Public Water Assets                                | Municipal water supply, hydraulic engineering, water board, PHED, utility owner                                                     |            20 |
| `ELE` | Street Lighting, Electricity & Urban Technology                   | Municipal electrical, street-lighting, DISCOM, traffic engineering, civic technology                                                |            20 |
| `HLT` | Public Health, Vector Control & Food Safety                       | Public health, pest control, food safety, sanitation, district health                                                               |            20 |
| `ENV` | Environment, Trees, Parks & Animals                               | Garden, tree authority, veterinary, animal husbandry, forest, pollution control                                                     |            20 |
| `BLD` | Buildings, Construction, Land Use & Encroachment                  | Building proposal, town planning, estate, ward enforcement, development authority                                                   |            20 |
| `TRF` | Traffic, Parking & Road Safety                                    | Traffic police, traffic engineering, roads, parking authority, transport department                                                 |            20 |
| `FAC` | Public Facilities, Education, Health Facilities & Civic Amenities | Municipal facilities, education, health, markets, social development, public works                                                  |            20 |
| `LAW` | Law, Order, Crime & Community Safety                              | Police, cybercrime unit, child protection, women protection, district administration                                                |            20 |
| `EMR` | Fire, Disaster & Emergency Hazards                                | Emergency response, fire brigade, police, ambulance, district disaster management                                                   |            20 |
| `PTM` | Public Transport & Mobility Services                              | Municipal/state transport undertaking, metro, railway, ferry, taxi regulator                                                        |            20 |
| `SOC` | Social Welfare, Protection & Vulnerable Persons                   | Social welfare, women and child development, police, health, labour, district administration                                        |            20 |
| `ADM` | Civic Administration, Revenue & Public Records                    | Municipal administration, revenue, registration, public information, citizen-service centres                                        |            20 |
| `REG` | Consumer Protection, Trade, Markets & Licensing                   | Municipal licensing, food safety, legal metrology, consumer affairs, market, fire, police or excise                                 |            20 |
| `COR` | Corruption, Bribery & Public Integrity                            | Independent municipal/state vigilance, Anti-Corruption Bureau, Lokayukta, CVC, police/EOW, or another competent oversight authority |            20 |

---

## 5. Waste, Cleanliness & Sanitation

**Primary category code:** `SWM`
**Typical authority family:** Municipal solid-waste, sanitation, public-health, ward operations

| Code      | Citizen-facing subcategory                    | Default primary type |
| --------- | --------------------------------------------- | -------------------- |
| `SWM-001` | Garbage dump                                  | `PUBLIC_HEALTH`      |
| `SWM-002` | Overflowing public dustbin                    | `SERVICE_FAILURE`    |
| `SWM-003` | Missed door-to-door waste collection          | `SERVICE_FAILURE`    |
| `SWM-004` | Missed road or street sweeping                | `SERVICE_FAILURE`    |
| `SWM-005` | Littered street, lane, or public place        | `PUBLIC_HEALTH`      |
| `SWM-006` | Construction and demolition waste dumping     | `ENFORCEMENT`        |
| `SWM-007` | Illegal waste burning                         | `ENVIRONMENTAL`      |
| `SWM-008` | Biomedical waste in a public area             | `PUBLIC_HEALTH`      |
| `SWM-009` | Hazardous or chemical waste dumping           | `SAFETY_HAZARD`      |
| `SWM-010` | Dead animal carcass removal                   | `PUBLIC_HEALTH`      |
| `SWM-011` | Unclean public toilet                         | `FACILITY_SERVICE`   |
| `SWM-012` | Public toilet without water                   | `FACILITY_SERVICE`   |
| `SWM-013` | Public toilet without lighting or electricity | `FACILITY_SERVICE`   |
| `SWM-014` | Market waste accumulation                     | `PUBLIC_HEALTH`      |
| `SWM-015` | Commercial establishment dumping waste        | `ENFORCEMENT`        |
| `SWM-016` | Garden or leaf waste not collected            | `SERVICE_FAILURE`    |
| `SWM-017` | Plastic-waste hotspot                         | `ENVIRONMENTAL`      |
| `SWM-018` | E-waste dumped in a public place              | `ENVIRONMENTAL`      |
| `SWM-019` | Bulk waste not collected                      | `SERVICE_FAILURE`    |
| `SWM-020` | Waste collection vehicle leakage or spillage  | `PUBLIC_HEALTH`      |

---

## 6. Roads, Footpaths & Public Infrastructure

**Primary category code:** `RDS`
**Typical authority family:** Municipal roads, engineering, PWD, highway or asset-owning agency

| Code      | Citizen-facing subcategory                   | Default primary type |
| --------- | -------------------------------------------- | -------------------- |
| `RDS-001` | Pothole or damaged municipal road            | `MAINTENANCE`        |
| `RDS-002` | Road cave-in or sinking road                 | `SAFETY_HAZARD`      |
| `RDS-003` | Uneven or broken road surface                | `MAINTENANCE`        |
| `RDS-004` | Damaged footpath or pavement                 | `MAINTENANCE`        |
| `RDS-005` | Missing or broken kerb                       | `MAINTENANCE`        |
| `RDS-006` | Incomplete road excavation or trench         | `SAFETY_HAZARD`      |
| `RDS-007` | Loose gravel, rubble, or debris on the road  | `SAFETY_HAZARD`      |
| `RDS-008` | Damaged road divider or median               | `MAINTENANCE`        |
| `RDS-009` | Missing or broken street-name sign           | `MAINTENANCE`        |
| `RDS-010` | Missing or damaged road-safety sign          | `SAFETY_HAZARD`      |
| `RDS-011` | Faded lane markings                          | `MAINTENANCE`        |
| `RDS-012` | Faded or unsafe pedestrian crossing          | `SAFETY_HAZARD`      |
| `RDS-013` | Damaged or unauthorized speed breaker        | `SAFETY_HAZARD`      |
| `RDS-014` | Damaged guardrail or crash barrier           | `SAFETY_HAZARD`      |
| `RDS-015` | Bridge or flyover surface damage             | `SAFETY_HAZARD`      |
| `RDS-016` | Subway or underpass structural damage        | `SAFETY_HAZARD`      |
| `RDS-017` | Damaged pedestrian railing or bollard        | `MAINTENANCE`        |
| `RDS-018` | Accessibility ramp or tactile-paving problem | `MAINTENANCE`        |
| `RDS-019` | Damaged cycle-track surface                  | `MAINTENANCE`        |
| `RDS-020` | Road shoulder or roadside-edge erosion       | `SAFETY_HAZARD`      |

---

## 7. Drainage, Sewerage & Flooding

**Primary category code:** `DRN`
**Typical authority family:** Storm-water drains, sewerage operations, hydraulic or disaster-management units

| Code      | Citizen-facing subcategory              | Default primary type |
| --------- | --------------------------------------- | -------------------- |
| `DRN-001` | Blocked storm-water drain               | `MAINTENANCE`        |
| `DRN-002` | Sewage overflow                         | `PUBLIC_HEALTH`      |
| `DRN-003` | Blocked sanitary sewer                  | `PUBLIC_HEALTH`      |
| `DRN-004` | Open or unsafe manhole                  | `SAFETY_HAZARD`      |
| `DRN-005` | Missing or broken manhole cover         | `SAFETY_HAZARD`      |
| `DRN-006` | Collapsed sewer or drain                | `SAFETY_HAZARD`      |
| `DRN-007` | Damaged drain cover or grating          | `SAFETY_HAZARD`      |
| `DRN-008` | Waterlogging on a road                  | `SAFETY_HAZARD`      |
| `DRN-009` | Flooded subway or underpass             | `SAFETY_HAZARD`      |
| `DRN-010` | Sewer backflow into a property          | `PUBLIC_HEALTH`      |
| `DRN-011` | Foul smell from a sewer                 | `PUBLIC_HEALTH`      |
| `DRN-012` | Illegal sewage discharge                | `ENFORCEMENT`        |
| `DRN-013` | Septic tank overflow                    | `PUBLIC_HEALTH`      |
| `DRN-014` | Public toilet sewer blockage            | `PUBLIC_HEALTH`      |
| `DRN-015` | Construction debris inside a drain      | `ENFORCEMENT`        |
| `DRN-016` | Clogged nullah or open drainage channel | `MAINTENANCE`        |
| `DRN-017` | Damaged culvert                         | `SAFETY_HAZARD`      |
| `DRN-018` | Blocked drain inlet or catch basin      | `MAINTENANCE`        |
| `DRN-019` | Sewage-line leakage                     | `PUBLIC_HEALTH`      |
| `DRN-020` | Blocked storm-water outlet or outfall   | `MAINTENANCE`        |

---

## 8. Water Supply & Public Water Assets

**Primary category code:** `WTR`
**Typical authority family:** Municipal water supply, hydraulic engineering, water board, PHED, utility owner

| Code      | Citizen-facing subcategory                   | Default primary type |
| --------- | -------------------------------------------- | -------------------- |
| `WTR-001` | Municipal water-line leakage                 | `MAINTENANCE`        |
| `WTR-002` | Major pipeline burst                         | `SAFETY_HAZARD`      |
| `WTR-003` | No water supply                              | `SERVICE_FAILURE`    |
| `WTR-004` | Low water pressure                           | `SERVICE_FAILURE`    |
| `WTR-005` | Irregular or intermittent water supply       | `SERVICE_FAILURE`    |
| `WTR-006` | Contaminated or discoloured water            | `PUBLIC_HEALTH`      |
| `WTR-007` | Foul-smelling or bad-tasting water           | `PUBLIC_HEALTH`      |
| `WTR-008` | Damaged public tap                           | `MAINTENANCE`        |
| `WTR-009` | Public tap continuously running              | `MAINTENANCE`        |
| `WTR-010` | Municipal water tanker not delivered         | `SERVICE_FAILURE`    |
| `WTR-011` | Suspected illegal water connection           | `ENFORCEMENT`        |
| `WTR-012` | Damaged or leaking water meter               | `MAINTENANCE`        |
| `WTR-013` | Open or damaged valve chamber                | `SAFETY_HAZARD`      |
| `WTR-014` | Overhead tank or reservoir overflow          | `MAINTENANCE`        |
| `WTR-015` | Water pumping-station failure                | `SERVICE_FAILURE`    |
| `WTR-016` | Fire hydrant damaged or inaccessible         | `SAFETY_HAZARD`      |
| `WTR-017` | Public drinking-water fountain failure       | `FACILITY_SERVICE`   |
| `WTR-018` | Pipeline damaged by roadwork or construction | `SAFETY_HAZARD`      |
| `WTR-019` | Water theft or unauthorized extraction       | `ENFORCEMENT`        |
| `WTR-020` | Water-supply schedule or zone disruption     | `SERVICE_FAILURE`    |

---

## 9. Street Lighting, Electricity & Urban Technology

**Primary category code:** `ELE`
**Typical authority family:** Municipal electrical, street-lighting, DISCOM, traffic engineering, civic technology

| Code      | Citizen-facing subcategory                  | Default primary type |
| --------- | ------------------------------------------- | -------------------- |
| `ELE-001` | Broken municipal streetlight                | `MAINTENANCE`        |
| `ELE-002` | Flickering streetlight                      | `MAINTENANCE`        |
| `ELE-003` | Streetlight remains on during daytime       | `SERVICE_FAILURE`    |
| `ELE-004` | Multiple streetlights out on one road       | `SAFETY_HAZARD`      |
| `ELE-005` | Broken or damaged streetlight pole          | `SAFETY_HAZARD`      |
| `ELE-006` | Leaning or unstable electrical pole         | `SAFETY_HAZARD`      |
| `ELE-007` | Exposed electrical wire                     | `EMERGENCY`          |
| `ELE-008` | Sparking or electrical short circuit        | `EMERGENCY`          |
| `ELE-009` | Open electrical junction box                | `SAFETY_HAZARD`      |
| `ELE-010` | Hanging or low electrical cable             | `SAFETY_HAZARD`      |
| `ELE-011` | Damaged transformer or feeder pillar        | `SAFETY_HAZARD`      |
| `ELE-012` | Stolen or damaged streetlight cable         | `CRIME_REPORT`       |
| `ELE-013` | High-mast light failure                     | `MAINTENANCE`        |
| `ELE-014` | Park lighting failure                       | `MAINTENANCE`        |
| `ELE-015` | Subway or underpass lighting failure        | `SAFETY_HAZARD`      |
| `ELE-016` | Bus-stop or public-shelter lighting failure | `MAINTENANCE`        |
| `ELE-017` | Solar streetlight failure                   | `MAINTENANCE`        |
| `ELE-018` | Traffic-signal power failure                | `SAFETY_HAZARD`      |
| `ELE-019` | Municipal CCTV camera malfunction           | `MAINTENANCE`        |
| `ELE-020` | Public Wi-Fi or civic digital-kiosk failure | `INFORMATION_ACCESS` |

---

## 10. Public Health, Vector Control & Food Safety

**Primary category code:** `HLT`
**Typical authority family:** Public health, pest control, food safety, sanitation, district health

| Code      | Citizen-facing subcategory                        | Default primary type |
| --------- | ------------------------------------------------- | -------------------- |
| `HLT-001` | Mosquito breeding or stagnant water               | `PUBLIC_HEALTH`      |
| `HLT-002` | Excessive mosquito nuisance or fogging request    | `PUBLIC_HEALTH`      |
| `HLT-003` | Rodent infestation                                | `PUBLIC_HEALTH`      |
| `HLT-004` | Cockroach or fly infestation                      | `PUBLIC_HEALTH`      |
| `HLT-005` | Unhygienic food premises                          | `PUBLIC_HEALTH`      |
| `HLT-006` | Suspected unsafe or adulterated food              | `PUBLIC_HEALTH`      |
| `HLT-007` | Open-defecation hotspot                           | `PUBLIC_HEALTH`      |
| `HLT-008` | Public-urination hotspot                          | `PUBLIC_HEALTH`      |
| `HLT-009` | Spitting or tobacco-stain hotspot                 | `PUBLIC_HEALTH`      |
| `HLT-010` | Persistent foul odour in a public area            | `PUBLIC_HEALTH`      |
| `HLT-011` | Improperly discarded infectious waste             | `PUBLIC_HEALTH`      |
| `HLT-012` | Unhygienic school or anganwadi premises           | `PUBLIC_HEALTH`      |
| `HLT-013` | Unhygienic hospital or health-centre surroundings | `PUBLIC_HEALTH`      |
| `HLT-014` | Mosquito breeding at a construction site          | `PUBLIC_HEALTH`      |
| `HLT-015` | Suspected waterborne-illness cluster              | `PUBLIC_HEALTH`      |
| `HLT-016` | Contaminated public drinking-water source         | `PUBLIC_HEALTH`      |
| `HLT-017` | Area not disinfected after flooding or sewage     | `PUBLIC_HEALTH`      |
| `HLT-018` | Unhygienic market or slaughter area               | `PUBLIC_HEALTH`      |
| `HLT-019` | Inadequate community sanitation                   | `SERVICE_FAILURE`    |
| `HLT-020` | Unhygienic public shelter or community facility   | `PUBLIC_HEALTH`      |

---

## 11. Environment, Trees, Parks & Animals

**Primary category code:** `ENV`
**Typical authority family:** Garden, tree authority, veterinary, animal husbandry, forest, pollution control

| Code      | Citizen-facing subcategory                      | Default primary type |
| --------- | ----------------------------------------------- | -------------------- |
| `ENV-001` | Fallen or dangerous tree                        | `SAFETY_HAZARD`      |
| `ENV-002` | Broken or hanging tree branch                   | `SAFETY_HAZARD`      |
| `ENV-003` | Tree pruning required                           | `MAINTENANCE`        |
| `ENV-004` | Suspected illegal tree cutting                  | `ENFORCEMENT`        |
| `ENV-005` | Tree roots damaging a road or building          | `SAFETY_HAZARD`      |
| `ENV-006` | Dead or diseased tree                           | `SAFETY_HAZARD`      |
| `ENV-007` | Municipal park not maintained                   | `MAINTENANCE`        |
| `ENV-008` | Broken playground equipment                     | `SAFETY_HAZARD`      |
| `ENV-009` | Damaged park bench, gate, or fence              | `MAINTENANCE`        |
| `ENV-010` | Park irrigation leakage                         | `MAINTENANCE`        |
| `ENV-011` | Garbage or unhygienic condition inside a park   | `PUBLIC_HEALTH`      |
| `ENV-012` | Stray-dog nuisance                              | `ANIMAL_WELFARE`     |
| `ENV-013` | Aggressive dog or dog-bite risk                 | `SAFETY_HAZARD`      |
| `ENV-014` | Injured stray animal                            | `ANIMAL_WELFARE`     |
| `ENV-015` | Stray cattle obstructing a public road          | `SAFETY_HAZARD`      |
| `ENV-016` | Animal-feeding activity causing public nuisance | `ENVIRONMENTAL`      |
| `ENV-017` | Snake or wildlife conflict in an urban area     | `SAFETY_HAZARD`      |
| `ENV-018` | Air pollution, smoke, or toxic fumes            | `ENVIRONMENTAL`      |
| `ENV-019` | Excessive noise pollution                       | `ENVIRONMENTAL`      |
| `ENV-020` | Polluted lake, river, pond, or water body       | `ENVIRONMENTAL`      |

---

## 12. Buildings, Construction, Land Use & Encroachment

**Primary category code:** `BLD`
**Typical authority family:** Building proposal, town planning, estate, ward enforcement, development authority

| Code      | Citizen-facing subcategory                        | Default primary type |
| --------- | ------------------------------------------------- | -------------------- |
| `BLD-001` | Suspected illegal construction                    | `ENFORCEMENT`        |
| `BLD-002` | Encroachment on road, footpath, or municipal land | `ENFORCEMENT`        |
| `BLD-003` | Unsafe or dilapidated building                    | `SAFETY_HAZARD`      |
| `BLD-004` | Imminent building-collapse risk                   | `EMERGENCY`          |
| `BLD-005` | Unauthorized floor, extension, or structure       | `ENFORCEMENT`        |
| `BLD-006` | Construction without visible permission           | `ENFORCEMENT`        |
| `BLD-007` | Construction site without safety barricading      | `SAFETY_HAZARD`      |
| `BLD-008` | Construction debris obstructing public space      | `ENFORCEMENT`        |
| `BLD-009` | Construction noise outside permitted hours        | `ENFORCEMENT`        |
| `BLD-010` | Uncontrolled construction dust                    | `ENVIRONMENTAL`      |
| `BLD-011` | Unauthorized or unsafe excavation                 | `SAFETY_HAZARD`      |
| `BLD-012` | Illegal hoarding or signboard                     | `ENFORCEMENT`        |
| `BLD-013` | Unauthorized vending stall or temporary structure | `ENFORCEMENT`        |
| `BLD-014` | Shop extension blocking a footpath                | `ENFORCEMENT`        |
| `BLD-015` | Encroachment on a drain or water body             | `ENFORCEMENT`        |
| `BLD-016` | Illegal land filling or reclamation               | `ENFORCEMENT`        |
| `BLD-017` | Basement misuse or illegal conversion             | `ENFORCEMENT`        |
| `BLD-018` | Building fire-safety violation                    | `SAFETY_HAZARD`      |
| `BLD-019` | Blocked emergency exit or staircase               | `SAFETY_HAZARD`      |
| `BLD-020` | Unsafe or unauthorized demolition                 | `SAFETY_HAZARD`      |

---

## 13. Traffic, Parking & Road Safety

**Primary category code:** `TRF`
**Typical authority family:** Traffic police, traffic engineering, roads, parking authority, transport department

| Code      | Citizen-facing subcategory                      | Default primary type |
| --------- | ----------------------------------------------- | -------------------- |
| `TRF-001` | Traffic-signal malfunction                      | `SAFETY_HAZARD`      |
| `TRF-002` | Damaged traffic-signal pole                     | `SAFETY_HAZARD`      |
| `TRF-003` | Missing traffic sign                            | `SAFETY_HAZARD`      |
| `TRF-004` | Incorrect or contradictory traffic sign         | `SAFETY_HAZARD`      |
| `TRF-005` | Illegal parking                                 | `ENFORCEMENT`        |
| `TRF-006` | Abandoned vehicle                               | `ENFORCEMENT`        |
| `TRF-007` | Vehicle blocking a footpath                     | `ENFORCEMENT`        |
| `TRF-008` | Vehicle blocking emergency access               | `SAFETY_HAZARD`      |
| `TRF-009` | Bus-stop obstruction                            | `ENFORCEMENT`        |
| `TRF-010` | Damaged bus shelter                             | `MAINTENANCE`        |
| `TRF-011` | Pedestrian-signal failure                       | `SAFETY_HAZARD`      |
| `TRF-012` | Unsafe pedestrian crossing or junction          | `SAFETY_HAZARD`      |
| `TRF-013` | Speeding hotspot or speed-calming request       | `SAFETY_HAZARD`      |
| `TRF-014` | Unauthorized speed breaker                      | `ENFORCEMENT`        |
| `TRF-015` | Parking-meter malfunction                       | `FACILITY_SERVICE`   |
| `TRF-016` | Auto-rickshaw or taxi-stand obstruction         | `ENFORCEMENT`        |
| `TRF-017` | School-zone traffic-safety issue                | `SAFETY_HAZARD`      |
| `TRF-018` | Cycle-lane obstruction                          | `ENFORCEMENT`        |
| `TRF-019` | Chronic congestion caused by civic obstruction  | `MAINTENANCE`        |
| `TRF-020` | Non-functioning traffic display or message sign | `MAINTENANCE`        |

---

## 14. Public Facilities, Education, Health Facilities & Civic Amenities

**Primary category code:** `FAC`
**Typical authority family:** Municipal facilities, education, health, markets, social development, public works

| Code      | Citizen-facing subcategory                                               | Default primary type |
| --------- | ------------------------------------------------------------------------ | -------------------- |
| `FAC-001` | Damaged municipal-school facility                                        | `FACILITY_SERVICE`   |
| `FAC-002` | Damaged anganwadi facility                                               | `FACILITY_SERVICE`   |
| `FAC-003` | Primary health-centre service or facility issue                          | `FACILITY_SERVICE`   |
| `FAC-004` | Municipal hospital service or facility issue                             | `FACILITY_SERVICE`   |
| `FAC-005` | Community hall facility issue                                            | `FACILITY_SERVICE`   |
| `FAC-006` | Crematorium or cemetery facility issue                                   | `FACILITY_SERVICE`   |
| `FAC-007` | Municipal market facility issue                                          | `FACILITY_SERVICE`   |
| `FAC-008` | Public library facility issue                                            | `FACILITY_SERVICE`   |
| `FAC-009` | Night shelter or homeless-shelter facility issue                         | `FACILITY_SERVICE`   |
| `FAC-010` | Public lift or escalator failure                                         | `SAFETY_HAZARD`      |
| `FAC-011` | Foot-overbridge facility issue                                           | `SAFETY_HAZARD`      |
| `FAC-012` | Municipal building access or service issue                               | `FACILITY_SERVICE`   |
| `FAC-013` | Broken public bench, bollard, or shelter                                 | `MAINTENANCE`        |
| `FAC-014` | Missing or damaged civic-information board                               | `MAINTENANCE`        |
| `FAC-015` | Damaged public boundary wall or fence                                    | `SAFETY_HAZARD`      |
| `FAC-016` | Open excavation or missing safety barricade                              | `SAFETY_HAZARD`      |
| `FAC-017` | Public drinking-water facility unavailable                               | `FACILITY_SERVICE`   |
| `FAC-018` | Accessibility barrier at a public facility                               | `FACILITY_SERVICE`   |
| `FAC-019` | Missing fire extinguisher or safety equipment in a public facility       | `SAFETY_HAZARD`      |
| `FAC-020` | Public facility unexpectedly closed or operating outside published hours | `SERVICE_FAILURE`    |

---

## 15. Law, Order, Crime & Community Safety

**Primary category code:** `LAW`
**Typical authority family:** Police, cybercrime unit, child protection, women protection, district administration

| Code      | Citizen-facing subcategory                                             | Default primary type |
| --------- | ---------------------------------------------------------------------- | -------------------- |
| `LAW-001` | Crime, assault, or violence in progress                                | `EMERGENCY`          |
| `LAW-002` | Assault reported after the incident                                    | `CRIME_REPORT`       |
| `LAW-003` | Robbery, snatching, or theft                                           | `CRIME_REPORT`       |
| `LAW-004` | Burglary, housebreaking, or criminal trespass                          | `CRIME_REPORT`       |
| `LAW-005` | Harassment, intimidation, or stalking                                  | `LAW_AND_ORDER`      |
| `LAW-006` | Domestic violence or intimate-partner abuse                            | `WELFARE_PROTECTION` |
| `LAW-007` | Sexual harassment or sexual assault                                    | `CRIME_REPORT`       |
| `LAW-008` | Women-safety concern in a public place                                 | `LAW_AND_ORDER`      |
| `LAW-009` | Child abuse, exploitation, or unsafe custody concern                   | `WELFARE_PROTECTION` |
| `LAW-010` | Missing person                                                         | `CRIME_REPORT`       |
| `LAW-011` | Suspicious person, vehicle, or repeated suspicious activity            | `LAW_AND_ORDER`      |
| `LAW-012` | Suspicious object or possible explosive                                | `EMERGENCY`          |
| `LAW-013` | Weapon or armed-threat sighting                                        | `EMERGENCY`          |
| `LAW-014` | Drug dealing or public drug activity                                   | `CRIME_REPORT`       |
| `LAW-015` | Vandalism, graffiti, or damage to public property                      | `CRIME_REPORT`       |
| `LAW-016` | Public fighting, riot, or violent unlawful assembly                    | `EMERGENCY`          |
| `LAW-017` | Public intoxication or disorderly conduct                              | `LAW_AND_ORDER`      |
| `LAW-018` | Severe public nuisance requiring police intervention                   | `LAW_AND_ORDER`      |
| `LAW-019` | Cybercrime, online fraud, identity theft, or digital financial fraud   | `CYBER_INCIDENT`     |
| `LAW-020` | Lost or stolen property, documents, or non-emergency police assistance | `CRIME_REPORT`       |

---

## 16. Fire, Disaster & Emergency Hazards

**Primary category code:** `EMR`
**Typical authority family:** Emergency response, fire brigade, police, ambulance, district disaster management

| Code      | Citizen-facing subcategory                              | Default primary type |
| --------- | ------------------------------------------------------- | -------------------- |
| `EMR-001` | Active fire or visible smoke                            | `EMERGENCY`          |
| `EMR-002` | Gas leak or strong gas smell                            | `EMERGENCY`          |
| `EMR-003` | Explosion, blast, or suspected explosive event          | `EMERGENCY`          |
| `EMR-004` | Building collapse                                       | `EMERGENCY`          |
| `EMR-005` | Immediate structural-collapse risk                      | `EMERGENCY`          |
| `EMR-006` | Flood rescue or person trapped by water                 | `EMERGENCY`          |
| `EMR-007` | Severe waterlogging creating immediate danger           | `EMERGENCY`          |
| `EMR-008` | Landslide, slope failure, or retaining-wall collapse    | `EMERGENCY`          |
| `EMR-009` | Tree fallen on road, building, or power line            | `EMERGENCY`          |
| `EMR-010` | Live high-voltage wire or major electrical danger       | `EMERGENCY`          |
| `EMR-011` | Chemical, fuel, or hazardous-material spill             | `EMERGENCY`          |
| `EMR-012` | Industrial accident or factory emergency                | `EMERGENCY`          |
| `EMR-013` | Road accident with injury or trapped person             | `EMERGENCY`          |
| `EMR-014` | Lift or elevator entrapment                             | `EMERGENCY`          |
| `EMR-015` | Drowning risk or water rescue                           | `EMERGENCY`          |
| `EMR-016` | Person trapped in excavation, confined space, or debris | `EMERGENCY`          |
| `EMR-017` | Earthquake damage or post-earthquake hazard             | `DISASTER_RESPONSE`  |
| `EMR-018` | Extreme-weather emergency or urgent shelter need        | `DISASTER_RESPONSE`  |
| `EMR-019` | Evacuation, temporary shelter, or rescue assistance     | `DISASTER_RESPONSE`  |
| `EMR-020` | Emergency relief supplies or post-disaster assistance   | `DISASTER_RESPONSE`  |

---

## 17. Public Transport & Mobility Services

**Primary category code:** `PTM`
**Typical authority family:** Municipal/state transport undertaking, metro, railway, ferry, taxi regulator

| Code      | Citizen-facing subcategory                                | Default primary type  |
| --------- | --------------------------------------------------------- | --------------------- |
| `PTM-001` | Scheduled bus route not operating                         | `TRANSPORT_SERVICE`   |
| `PTM-002` | Excessive delay, cancellation, or irregular frequency     | `TRANSPORT_SERVICE`   |
| `PTM-003` | Dangerous overcrowding in public transport                | `SAFETY_HAZARD`       |
| `PTM-004` | Unsafe or reckless public-transport driving               | `SAFETY_HAZARD`       |
| `PTM-005` | Driver or conductor misconduct                            | `TRANSPORT_SERVICE`   |
| `PTM-006` | Incorrect fare, ticket, pass, or refund issue             | `TRANSPORT_SERVICE`   |
| `PTM-007` | Bus stop missing, shifted, or incorrectly marked          | `TRANSPORT_SERVICE`   |
| `PTM-008` | Damaged or unhygienic bus shelter                         | `FACILITY_SERVICE`    |
| `PTM-009` | Accessibility problem on a bus or at a stop               | `TRANSPORT_SERVICE`   |
| `PTM-010` | Metro or railway station facility issue                   | `FACILITY_SERVICE`    |
| `PTM-011` | Metro service disruption or passenger-information failure | `TRANSPORT_SERVICE`   |
| `PTM-012` | Local-train station access, safety, or cleanliness issue  | `FACILITY_SERVICE`    |
| `PTM-013` | Auto-rickshaw or taxi refusal                             | `CONSUMER_REGULATORY` |
| `PTM-014` | Taxi or auto fare overcharge                              | `CONSUMER_REGULATORY` |
| `PTM-015` | Unsafe taxi, auto, or app-cab conduct                     | `SAFETY_HAZARD`       |
| `PTM-016` | Ferry or water-transport service issue                    | `TRANSPORT_SERVICE`   |
| `PTM-017` | Last-mile shuttle or shared-mobility service issue        | `TRANSPORT_SERVICE`   |
| `PTM-018` | Public bicycle-sharing service issue                      | `TRANSPORT_SERVICE`   |
| `PTM-019` | Public parking facility service issue                     | `FACILITY_SERVICE`    |
| `PTM-020` | Paratransit or special-mobility assistance issue          | `TRANSPORT_SERVICE`   |

---

## 18. Social Welfare, Protection & Vulnerable Persons

**Primary category code:** `SOC`
**Typical authority family:** Social welfare, women and child development, police, health, labour, district administration

| Code      | Citizen-facing subcategory                                     | Default primary type       |
| --------- | -------------------------------------------------------------- | -------------------------- |
| `SOC-001` | Homeless person requesting shelter or outreach                 | `WELFARE_PROTECTION`       |
| `SOC-002` | Elderly person at risk, abandoned, or needing assistance       | `WELFARE_PROTECTION`       |
| `SOC-003` | Person with disability requiring urgent support                | `WELFARE_PROTECTION`       |
| `SOC-004` | Child begging or child living on the street                    | `WELFARE_PROTECTION`       |
| `SOC-005` | Suspected child labour                                         | `WELFARE_PROTECTION`       |
| `SOC-006` | Domestic violence support or safe-shelter request              | `WELFARE_PROTECTION`       |
| `SOC-007` | Women shelter, protection, or crisis-support request           | `WELFARE_PROTECTION`       |
| `SOC-008` | Missing, abandoned, or unaccompanied child                     | `WELFARE_PROTECTION`       |
| `SOC-009` | Suspected human trafficking                                    | `EMERGENCY`                |
| `SOC-010` | Person experiencing a mental-health crisis                     | `WELFARE_PROTECTION`       |
| `SOC-011` | Person at immediate risk of self-harm                          | `EMERGENCY`                |
| `SOC-012` | Substance-use treatment or rehabilitation referral             | `WELFARE_PROTECTION`       |
| `SOC-013` | Food insecurity or emergency community-meal request            | `WELFARE_PROTECTION`       |
| `SOC-014` | Migrant worker shelter, transport, or support request          | `WELFARE_PROTECTION`       |
| `SOC-015` | Public-distribution or ration-service denial                   | `ADMINISTRATIVE_GRIEVANCE` |
| `SOC-016` | Pension, scholarship, or welfare-benefit delay                 | `ADMINISTRATIVE_GRIEVANCE` |
| `SOC-017` | Unsafe or unhygienic shelter-home conditions                   | `WELFARE_PROTECTION`       |
| `SOC-018` | Rehabilitation support after eviction, demolition, or disaster | `WELFARE_PROTECTION`       |
| `SOC-019` | Suspected bonded labour, forced labour, or exploitation        | `CRIME_REPORT`             |
| `SOC-020` | Accessibility discrimination or denial of public service       | `WELFARE_PROTECTION`       |

---

## 19. Civic Administration, Revenue & Public Records

**Primary category code:** `ADM`
**Typical authority family:** Municipal administration, revenue, registration, public information, citizen-service centres

| Code      | Citizen-facing subcategory                                                  | Default primary type       |
| --------- | --------------------------------------------------------------------------- | -------------------------- |
| `ADM-001` | Birth certificate delay or non-issuance                                     | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-002` | Death certificate delay or non-issuance                                     | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-003` | Marriage registration or certificate issue                                  | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-004` | Correction in a civil or municipal record                                   | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-005` | Property-tax assessment or mutation issue                                   | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-006` | Property-tax payment, receipt, rebate, or refund issue                      | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-007` | Water, sewer, or municipal service-bill dispute                             | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-008` | Building-permission application status or delay                             | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-009` | Occupancy, completion, or municipal NOC application delay                   | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-010` | Grievance not acknowledged or reference number not generated                | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-011` | Complaint closed without action or with incorrect reason                    | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-012` | RTI filing, transfer, fee, or response issue                                | `INFORMATION_ACCESS`       |
| `ADM-013` | Public record or government-information request                             | `INFORMATION_ACCESS`       |
| `ADM-014` | Land or revenue-record correction                                           | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-015` | Domicile, income, caste, or residence-certificate service issue             | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-016` | Voter-service or electoral-record query                                     | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-017` | Ration-card or household-record service issue                               | `ADMINISTRATIVE_GRIEVANCE` |
| `ADM-018` | Online portal, payment, login, or application-tracking failure              | `INFORMATION_ACCESS`       |
| `ADM-019` | Language, accessibility, or assisted-service problem                        | `INFORMATION_ACCESS`       |
| `ADM-020` | Government office delay, refusal, misconduct, or unexplained service denial | `ADMINISTRATIVE_GRIEVANCE` |

---

## 20. Consumer Protection, Trade, Markets & Licensing

**Primary category code:** `REG`
**Typical authority family:** Municipal licensing, food safety, legal metrology, consumer affairs, market, fire, police or excise

| Code      | Citizen-facing subcategory                                         | Default primary type  |
| --------- | ------------------------------------------------------------------ | --------------------- |
| `REG-001` | Unlicensed commercial establishment                                | `CONSUMER_REGULATORY` |
| `REG-002` | Expired, missing, or misused trade licence                         | `CONSUMER_REGULATORY` |
| `REG-003` | Unhygienic municipal or private market premises                    | `PUBLIC_HEALTH`       |
| `REG-004` | Unfair pricing or overcharging                                     | `CONSUMER_REGULATORY` |
| `REG-005` | Incorrect weights or measures                                      | `CONSUMER_REGULATORY` |
| `REG-006` | Misleading public advertisement or consumer claim                  | `CONSUMER_REGULATORY` |
| `REG-007` | Illegal hoarding, banner, billboard, or outdoor advertisement      | `ENFORCEMENT`         |
| `REG-008` | Street-vendor licence, zone, or harassment issue                   | `CONSUMER_REGULATORY` |
| `REG-009` | Market stall allocation, obstruction, or unauthorized occupation   | `ENFORCEMENT`         |
| `REG-010` | Restaurant hygiene or municipal licensing complaint                | `PUBLIC_HEALTH`       |
| `REG-011` | Food adulteration or unsafe packaged food                          | `PUBLIC_HEALTH`       |
| `REG-012` | Meat shop, slaughterhouse, or animal-product hygiene complaint     | `PUBLIC_HEALTH`       |
| `REG-013` | Commercial fire-NOC or fire-safety violation                       | `SAFETY_HAZARD`       |
| `REG-014` | Liquor-sale nuisance or suspected licensing violation              | `CONSUMER_REGULATORY` |
| `REG-015` | Sale of prohibited, counterfeit, or hazardous goods                | `CONSUMER_REGULATORY` |
| `REG-016` | Pharmacy or medical-shop regulatory complaint                      | `CONSUMER_REGULATORY` |
| `REG-017` | Commercial material or goods blocking public space                 | `ENFORCEMENT`         |
| `REG-018` | Telecom or cable operator damaging a road or public asset          | `ENFORCEMENT`         |
| `REG-019` | Event, procession, public-gathering, or temporary-permit violation | `ENFORCEMENT`         |
| `REG-020` | Commercial noise, nuisance, or operating-hours violation           | `ENFORCEMENT`         |

---

## 21. Corruption, Bribery & Public Integrity

**Primary category code:** `COR`
**Typical authority family:** Independent municipal/state vigilance, Chief Vigilance Officer, Anti-Corruption Bureau, Lokayukta, Central Vigilance Commission where applicable, police/EOW, or another competent oversight authority

| Code      | Citizen-facing subcategory                                               | Default primary type |
| --------- | ------------------------------------------------------------------------ | -------------------- |
| `COR-001` | Bribe demanded for a public service or official action                   | `ANTI_CORRUPTION`    |
| `COR-002` | Bribe demanded through an intermediary or agent                          | `ANTI_CORRUPTION`    |
| `COR-003` | Extortion or coercive payment demanded by a public official              | `ANTI_CORRUPTION`    |
| `COR-004` | Payment demanded to expedite or avoid delaying an application            | `ANTI_CORRUPTION`    |
| `COR-005` | Kickback or commission in public procurement or a government contract    | `ANTI_CORRUPTION`    |
| `COR-006` | Tender manipulation, bid rigging or collusive procurement                | `ANTI_CORRUPTION`    |
| `COR-007` | Procurement favouritism or undisclosed preferential treatment            | `ANTI_CORRUPTION`    |
| `COR-008` | Misappropriation or embezzlement of public funds                         | `ANTI_CORRUPTION`    |
| `COR-009` | Diversion or theft of public materials, supplies or assets               | `ANTI_CORRUPTION`    |
| `COR-010` | Fraudulent billing, false invoices or inflated measurements              | `ANTI_CORRUPTION`    |
| `COR-011` | Public work falsely certified, incompletely delivered or not performed   | `ANTI_CORRUPTION`    |
| `COR-012` | Conflict of interest or undisclosed related-party decision               | `ANTI_CORRUPTION`    |
| `COR-013` | Nepotism or favouritism in public recruitment, appointment or allocation | `ANTI_CORRUPTION`    |
| `COR-014` | Abuse of official position or discretion for private gain                | `ANTI_CORRUPTION`    |
| `COR-015` | Corruption involving a licence, permit, certificate, NOC or approval     | `ANTI_CORRUPTION`    |
| `COR-016` | Corruption involving tax, fee, fine, assessment or enforcement action    | `ANTI_CORRUPTION`    |
| `COR-017` | Tampering, suppression or destruction of official records or evidence    | `ANTI_CORRUPTION`    |
| `COR-018` | Welfare-benefit leakage, illegal deduction or demanded commission        | `ANTI_CORRUPTION`    |
| `COR-019` | Threat, retaliation or intimidation after reporting corruption           | `ANTI_CORRUPTION`    |
| `COR-020` | Other suspected public-sector corruption or integrity violation          | `ANTI_CORRUPTION`    |

Corruption intake is a protected workflow:

- Default every `COR` record to `PRIVATE`; never place it in the public feed, comments, voting, community support, or public map.
- Do not require live capture or geofencing. Permit a record without media and protect any uploaded evidence with private storage, strict retention, and access auditing.
- Resolve an independent oversight destination from jurisdiction and accused-organization context. Never route a report to the accused office, its ordinary supervisory chain, or a generic ward complaint mailbox.
- Capture the accused authority, department, office, or role only as allegation context. The client must never choose the official recipient.
- Apply an approved confidentiality, whistleblower-protection, referral, and evidence policy before enabling submission.
- `COR-003` and `COR-017` can require a protected crime-report referral; `COR-018` can require an administrative-grievance referral; `COR-019` can require a law-and-order referral and emergency redirection when danger is immediate.

---

## 22. Mapping of the current JagrukSetu complaint set

| Current complaint                                 | Taxonomy code |
| ------------------------------------------------- | ------------- |
| Garbage dump                                      | `SWM-001`     |
| Missed sweeping                                   | `SWM-004`     |
| Pothole / damaged municipal road                  | `RDS-001`     |
| Blocked storm-water drain                         | `DRN-001`     |
| Sewage overflow                                   | `DRN-002`     |
| Blocked sanitary sewer                            | `DRN-003`     |
| Municipal water-line leakage                      | `WTR-001`     |
| Broken municipal streetlight                      | `ELE-001`     |
| Open or unsafe manhole                            | `DRN-004`     |
| Mosquito breeding / stagnant water                | `HLT-001`     |
| Suspected illegal construction                    | `BLD-001`     |
| Encroachment on road, footpath, or municipal land | `BLD-002`     |
| Fallen or dangerous tree                          | `ENV-001`     |

The earlier combined sewage complaint is deliberately split into `DRN-002` and `DRN-003`, because overflow and blockage can require different operational actions even when they reach the same department.

---

## 23. Privacy and publication classes

| Class               | Default treatment                                                                   | Examples                                                  |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `PUBLIC`            | May appear on the locality map after moderation and location generalization         | Potholes, garbage, streetlights                           |
| `RESTRICTED`        | Visible only to reporter, assigned authority, and authorized staff                  | Illegal construction, encroachment, food-safety evidence  |
| `PRIVATE`           | No public feed, comments, voting, or exact-location exposure                        | Crime reports, harassment, missing persons, welfare cases |
| `EMERGENCY_PRIVATE` | Immediate emergency redirection; private incident record only if the user continues | Fire, active violence, collapse, gas leak, self-harm risk |

Recommended defaults:

- `LAW`, `EMR`, `SOC`, and `COR` complaints should normally be `PRIVATE` or `EMERGENCY_PRIVATE`.
- Complaints involving minors, domestic violence, sexual offences, trafficking, self-harm, medical information, or alleged offenders must never be public by default.
- Exact locations for vulnerable people, private homes, shelters, hospitals, and active investigations must remain restricted.

---

## 24. Recommended routing-profile fields

Each enabled subcategory should resolve to a versioned routing profile containing:

```text
subcategory_id
jurisdiction_id
administrative_unit_id
asset_type_id
asset_owner_id
primary_authority_id
primary_department_id
primary_office_id
primary_officer_role_id
fallback_authority_id
fallback_department_id
fallback_officer_role_id
priority
sla_policy_id
emergency_policy_id
evidence_policy_id
visibility_policy_id
effective_from
effective_to
verification_status
source_evidence_id
is_active
```

---

## 25. Recommended subcategory configuration fields

```text
id
primary_category_id
code
name
short_description
citizen_guidance
primary_type
secondary_types[]
default_asset_type
default_priority
sensitivity_class
public_visibility_default
emergency_capable
live_capture_required
gallery_upload_allowed
video_allowed
voice_allowed
minimum_media_count
location_radius_m
anonymous_reporting_allowed
comments_allowed
community_support_allowed
moderation_policy_id
is_active
configuration_status
routing_status
```

---

## 26. Emergency and sensitive-workflow safeguards

- Do not display a normal social posting flow before emergency redirection for `EMERGENCY` records.
- Do not allow comments, upvotes, or public map markers for active crime, domestic violence, sexual offences, missing persons, child protection, trafficking, self-harm risk, or medical crises.
- Do not automatically forward allegations or media to public officials through personal phone numbers or unapproved channels.
- Do not route a corruption allegation to the accused office, the accused reporting chain, or an ordinary ward complaint mailbox.
- Preserve evidence privately, record access in the audit log, and apply strict retention and deletion rules.
- The platform should use jurisdiction-configured emergency and police channels rather than hardcoded assumptions.
- A user should be able to return from emergency guidance and create a private follow-up record, but the interface must state that this does not replace an emergency call or formal police report.

---

## 27. Recommended activation tiers

| Tier                    | Scope                                                                    | Recommended use                                                                        |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `TIER_1_CORE_CIVIC`     | SWM, roads, drainage, water, streetlights, trees, public health          | Activate first where municipal routing is verified                                     |
| `TIER_2_EXTENDED_CIVIC` | Buildings, traffic infrastructure, facilities, transport, administration | Activate after authority and office crosswalks are approved                            |
| `TIER_3_REGULATORY`     | Licensing, markets, food safety, consumer and enforcement matters        | Activate only with regulatory ownership and evidence rules                             |
| `TIER_4_PROTECTED`      | Law, crime, welfare, child protection, domestic violence, corruption     | Private workflows with trained staff, independent intake, and formal agency agreements |
| `TIER_5_EMERGENCY`      | Fire, collapse, violence, rescue, self-harm, hazardous materials         | Emergency redirection first; no ordinary public complaint flow                         |

A municipality can seed all 340 records but initially activate only the subset with verified routing.

---

## 28. Suggested first operational activation

For a Pune or Mumbai pilot, begin with approximately 30–40 source-backed categories:

- garbage dump and overflowing bin;
- missed collection and sweeping;
- pothole, road cave-in, damaged footpath, open trench;
- blocked storm-water drain, sewage overflow, blocked sewer, open manhole, waterlogging;
- water leakage, pipeline burst, no supply, contaminated water;
- broken streetlight, damaged pole, exposed wire;
- mosquito breeding and vector-control request;
- fallen tree, dangerous branch, park hazard;
- illegal construction, unsafe building, encroachment;
- traffic-signal failure, missing sign, unsafe pedestrian crossing;
- selected public-facility issues;
- emergency redirection categories without public posting.

Store all remaining categories as:

```text
is_active = false
configuration_status = taxonomy_ready
routing_status = pending_verification
```

---

## 29. Search aliases and localization

Every subcategory should have searchable English, Hindi, Marathi, and locally used aliases. Examples:

| Taxonomy code | English aliases                         | Indic/local aliases to configure |
| ------------- | --------------------------------------- | -------------------------------- |
| `SWM-001`     | garbage, waste, trash, rubbish          | kachra, कचरा                     |
| `RDS-001`     | pothole, road hole, broken road         | khadda, खड्डा                    |
| `DRN-002`     | sewage, sewer overflow, gutter overflow | gutter, गटार, सांडपाणी           |
| `WTR-001`     | pipe leakage, water leak, burst pipe    | pani leakage, पाणी गळती          |
| `ELE-001`     | streetlight, road light, lamp failure   | दिवा बंद, street light बंद       |
| `HLT-001`     | mosquito, stagnant water, breeding      | डास, साचलेले पाणी                |

Aliases are search metadata only. They must resolve to a canonical taxonomy code.

---

## 30. Final implementation rule

The taxonomy defines **what the citizen is reporting**. It does not by itself determine **who receives the complaint**.

```text
Citizen category
  + verified location
  + jurisdiction
  + asset type
  + asset owner
  + active routing rule
  + durable office and role
  = final complaint destination
```

JagrukSetu must never route solely from the category label, and it must never activate a sensitive, police, welfare, anti-corruption, or emergency workflow without the corresponding privacy and agency controls. A corruption allegation must never be sent to the accused office or an ordinary ward recipient.
