
name: acris-property-pull description: Pulls structured property facts (PLUTO + ACRIS) for any NYC address — building specs, full transaction history, mortgage history, current deed record, person-vs-entity owner flag — and writes them to Joe's TAM database under tam-database/. Invoke whenever Joe asks to "pull property data," "look up an address in ACRIS," "get the deed history on X," "add an address to the TAM," "start a dossier on a property," or refers to "the database," "the TAM," or "the Brooklyn Heights block." Also use when Joe lists multiple addresses and asks to research them. Even if he doesn't name ACRIS or PLUTO, if the task is "get me the public-record facts on this property," use this skill. This is the foundation step — owner enrichment and dossier rendering are separate downstream skills.
ACRIS Property Pull
Joe is building a TAM (total addressable market) database of NYC townhouse properties. Every address in his TAM gets a dossier — whether or not the owner is identifiable. This skill is the foundation step: it pulls structured property facts from NYC public records (PLUTO + ACRIS) and writes them to the database.

The unit of work is the property, not the owner. An LLC-owned property with no resolvable beneficial owner still gets a complete record on its building, transaction history, mortgage history, and current deed. Owner enrichment (researching the person on the deed) is a separate downstream skill (owner-research); entity tracing for LLCs/trusts is another (llc-trace); rendering the full dossier from this data is yet another (dossier-render). This skill's job is to produce the canonical property JSON that all of those consume.
When to use this skill
Trigger on any of:

	•	"Pull property facts for [address]"
	•	"Look up [address] in ACRIS"
	•	"Get the deed history on [address]"
	•	"Add [address(es)] to the TAM"
	•	"Start a dossier on [address]"
	•	"Research [address]" — when the request is for public-record facts, not owner enrichment
	•	"Build records for [block / street / list of addresses]"
	•	Any reference to "the TAM," "the database," "the Brooklyn Heights block," or similar that implies populating the property database

If Joe asks for the owner's profile (employer, age, contact, etc.), that's owner-research. If he asks for "everything about this property," run this skill first — it produces the property data that owner-research and dossier-render then consume.
Inputs
The skill accepts any of:

	•	A single address string — "1 Monroe Place, Brooklyn" or "1 Monroe Place" (NYC is assumed)
	•	A single BBL — "3002430001" (10-digit borough-block-lot identifier)
	•	A list of either or both

Address strings are normalized to BBL via PLUTO geocoding. If an address is ambiguous (multiple PLUTO matches) or fails to geocode, the skill flags it and skips — do not silently guess. Surface the failures to Joe so he can disambiguate.

Default scope: townhouses (building classes A4/A5/A7/A9/B1/B2/B3/B9/C0). The skill will still run on a non-townhouse address if asked — it just won't filter on building class. Joe's TAM is townhouse-led but he sometimes researches a specific apartment or other property; don't refuse those.
What gets pulled
Always (from PLUTO and ACRIS):

	•	BBL, address, borough, block, lot
	•	Building class, year built, units (residential + commercial), lot dimensions, building dimensions
	•	Assessed value (current actual + transitional), zoning
	•	Full deed history: every recorded deed on the BBL with date, document ID, party names (grantor/grantee), recorded price, document type
	•	Full mortgage history: every mortgage on the BBL with date, lender, original amount, satisfaction status
	•	Current owner of record (most recent deed's grantee) + person-vs-entity flag

Derived flags (computed from the raw data):

	•	intra_family_or_trust_transfer — set on any deed where recorded price is < $100. These are not real sales; the true price lives on an earlier deed. Always check the prior deed for the actual purchase price.
	•	mortgage_satisfied — set when an ACRIS satisfaction record exists for the mortgage (document types SAT, REL, or PREL link back to the original mortgage doc).
	•	current_owner_is_entity — true when the current owner name matches LLC / Inc / Trust / Trustees / Corp / LP / LLP patterns; otherwise treated as a named individual.
	•	years_at_address — derived from the most recent arm's-length deed date (skipping intra-family transfers).
	•	approximate_equity — a rough estimate: current assessed value minus outstanding mortgage balance (lenders' last unsatisfied mortgage). This is a soft signal; flag it as estimate, not fact.

Out of scope for this skill (handled elsewhere):

	•	Owner research (LinkedIn, employer, age, contact info) — owner-research
	•	LLC beneficial owner tracing — llc-trace
	•	StreetEasy / OLR listing history — manual or future listing-history-import skill
	•	DOB violations / permits / certificate of occupancy
	•	The full dossier file — dossier-render
How to run
The pipeline is in scripts/pull_property.py. Invoke it rather than re-deriving the Socrata queries — every part of this script encodes a quirk that took the Monroe Place pilot real time to figure out. See references/data_sources.md for the full source map (ACRIS table IDs, PLUTO fields, satisfaction code logic, URL encoding rules).

python scripts/pull_property.py --address "1 Monroe Place, Brooklyn"

python scripts/pull_property.py --bbl 3002430001

python scripts/pull_property.py --addresses-file my_block.txt

The script writes output to the TAM database at /Users/dada/Desktop/Claude - Real Estate/Real Estate/tam-database/. For each address, it creates:

tam-database/<neighborhood>/<street-slug>/<address-slug>/

├── property.json    # canonical structured data (the contract)

├── property.md      # human-readable summary of the same data (for review)

└── sources/         # raw API pulls, for debugging and verification

    ├── pluto.json

    ├── acris_master.json

    ├── acris_legals.json

    └── acris_parties.json

Re-running on the same address overwrites property.json and refreshes sources/. The script is idempotent.

After it runs, append the address to tam-database/index.csv (create the file if missing). The index has one row per address with: bbl, address, neighborhood, street_slug, address_slug, current_owner_name, current_owner_is_entity, last_deed_date, last_arm_length_price, last_verified.
Output: property.json schema
This is the contract every downstream skill reads. Stable field names matter.

{

  "address": "1 Monroe Place, Brooklyn, NY 11201",

  "bbl": "3002430001",

  "borough": "Brooklyn",

  "block": "243",

  "lot": "1",

  "neighborhood": "Brooklyn Heights",

  "building": {

    "class": "A4",

    "year_built": 1840,

    "year_altered": null,

    "units_residential": 1,

    "units_commercial": 0,

    "lot_area_sqft": 2400,

    "building_area_sqft": 5200,

    "stories": 4,

    "zoning": "R6",

    "landmark_status": "Brooklyn Heights Historic District"

  },

  "assessment": {

    "assessed_value_total": 2400000,

    "assessed_value_actual": 5340000,

    "tax_year": "2026/27",

    "exemptions": []

  },

  "current_owner": {

    "name": "JANE Q DOE",

    "is_entity": false,

    "deed_date": "2018-06-15",

    "deed_price": 4200000,

    "deed_document_id": "2018061500123456",

    "intra_family_or_trust_transfer": false,

    "years_at_address": 7.9

  },

  "transaction_history": [

    {

      "document_id": "2018061500123456",

      "doc_type": "DEED",

      "recorded_date": "2018-06-15",

      "price": 4200000,

      "grantor": ["JOHN R SMITH"],

      "grantee": ["JANE Q DOE"],

      "intra_family_or_trust_transfer": false

    },

    {

      "document_id": "...",

      "doc_type": "DEED",

      "recorded_date": "1998-03-22",

      "price": 0,

      "grantor": ["SMITH FAMILY TRUST"],

      "grantee": ["JOHN R SMITH"],

      "intra_family_or_trust_transfer": true

    }

  ],

  "mortgage_history": [

    {

      "document_id": "...",

      "doc_type": "MTGE",

      "recorded_date": "2018-06-15",

      "lender": "WELLS FARGO BANK NA",

      "original_amount": 2500000,

      "satisfied": true,

      "satisfaction_document_id": "...",

      "satisfaction_date": "2023-04-10"

    }

  ],

  "derived": {

    "approximate_equity_estimate": 3100000,

    "approximate_equity_estimate_note": "Assessed actual value minus outstanding mortgage balance. Estimate only."

  },

  "meta": {

    "pulled_at": "2026-05-14T18:22:00Z",

    "data_sources": ["PLUTO", "ACRIS Master", "ACRIS Legals", "ACRIS Parties"],

    "last_verified": "2026-05-14",

    "confidence": {

      "overall": 5,

      "current_owner": 5,

      "transaction_history": 5,

      "mortgage_history": 4,

      "approximate_equity_estimate": 2

    },

    "alternates": [],

    "notes": []

  }

}

If any field can't be populated (e.g., PLUTO returns nothing for a known address), set it to null and add a line in meta.notes explaining what was missing and why. Don't fabricate fields.
Output: property.md format
The human-readable companion to property.json. Same data, formatted to read in 30 seconds. Use this exact template:

# [Full address]

**BBL:** [bbl] · **Neighborhood:** [neighborhood] · **Building class:** [class]

**Year built:** [year] · **Units:** [residential/commercial] · **Lot:** [sqft]

**Last verified:** [date]

## Current owner of record

[Name] — [individual / LLC / trust]

Acquired [date] for [$price or "transfer of record"], [years_at_address] years at address.

[If LLC/trust: flag as "OBFUSCATED — beneficial owner not yet resolved" and note that `llc-trace` is the next step.]

## Transaction history

| Date | Type | Price | Grantor → Grantee | Notes |

|------|------|-------|-------------------|-------|

| ... | DEED | $X | A → B | intra-family transfer |

## Mortgage history

| Date | Lender | Original | Status |

|------|--------|----------|--------|

| ... | Wells Fargo | $2.5M | Satisfied 2023-04-10 |

## Derived signals

- **Approximate equity:** [$amount] (estimate)

- **Years at address:** [n.n]

- **Tax exemptions:** [list or "none recorded"]

## Sources

PLUTO · ACRIS Master · ACRIS Legals · ACRIS Parties

Pulled [datetime]. Overall confidence: [n]/5.
Data quirks you must handle
These bit the Monroe Place pilot — they will bite again.

	•	$0 / $10 deeds are intra-family or trust transfers, not real sales. Always flag and skip when computing "years at address" or "last purchase price." The real purchase price lives on an earlier arm's-length deed. The script encodes this; don't strip it.

	•	Mortgage satisfaction uses codes SAT, REL, PREL — not "SATIS" or "RELEASE" or anything spelled out. To detect a paid-off mortgage, look for a satisfaction document whose ACRIS References record points back to the original mortgage's document ID.

	•	ACRIS batch lookups need the $where document_id in (...) form. Repeating document_id=X&document_id=Y in a URL does not work — Socrata returns only the last value. Always batch via $where.

	•	Socrata URL encoding: leave $, (, ), ,, ' unencoded but encode spaces. Python's urllib.parse.quote over-encodes by default and breaks the queries. The script has a custom encoder; use it.

	•	Staten Island is not in ACRIS. It uses the county clerk's separate system. If a Staten Island address is requested, fail loudly — don't pretend to have data.

	•	Host allowlist: data.cityofnewyork.us must be enabled in Settings → Capabilities for the queries to work from this environment.
When the data is thin
Some addresses have sparse records. Possible reasons and handling:

	•	No PLUTO match — address doesn't geocode. Surface to Joe with the original input; don't guess. Likely a typo or non-NYC address.
	•	No ACRIS records — possible for very old properties that haven't transacted since ACRIS started (1966 for Manhattan, varies by borough). Note this in meta.notes and ship the PLUTO-only record. The dossier still has property facts.
	•	Owner name on the deed is mangled — ACRIS party records can have spelling variations of the same person. Don't try to normalize names in this skill; preserve them as-is and let owner-research handle disambiguation.
	•	Recent deed has no price — sometimes ACRIS records carry $0 because price wasn't recorded in the document. Don't infer; mark as "price not recorded" in meta.notes.
What this skill does NOT do
	•	Does not enrich the owner (no LinkedIn lookups, no contact info, no profile data) — that's owner-research.
	•	Does not attempt to identify beneficial owners of LLCs or trusts — that's llc-trace.
	•	Does not render the full dossier file — that's dossier-render.
	•	Does not pull StreetEasy or OLR listing history — those aren't public APIs.
	•	Does not send anything externally or contact anyone.
Confidence scoring
Apply this rubric on meta.confidence:

	•	5 — Single PLUTO match, complete ACRIS chain, no ambiguity.
	•	4 — Complete data but one minor anomaly (e.g., a deed with no recorded price, an unresolved mortgage status).
	•	3 — Partial data: PLUTO good, ACRIS has gaps, or one transaction is unclear. Usable but flag for human review.
	•	2 — Significant gaps: missing transaction history, ambiguous owner name. Surface to Joe.
	•	1 — Largely unverified: address didn't fully geocode, ACRIS returned little. Logged as a placeholder pending manual fix.
Edge cases
	•	Same building, multiple lots (rare for townhouses, common for converted multi-unit buildings): pull records for each lot and write separate property folders. Cross-reference in meta.notes.
	•	Recently sold (within last 30 days): ACRIS lag can mean the new deed isn't recorded yet. Note "possibly stale" in meta.notes if the only "current owner" record is older than expected for the address.
	•	Joe asks for a non-townhouse address: run anyway. The building class filter is a default, not a rule.
	•	Joe asks for hundreds of addresses at once: process in batches of ~20 (Socrata rate limits). Report progress as you go.

