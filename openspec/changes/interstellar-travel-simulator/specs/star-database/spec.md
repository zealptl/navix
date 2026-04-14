## ADDED Requirements

### Requirement: HYG catalog seeded into SQLite
The backend SHALL seed the HYG stellar catalog (~119,000 stars) into a SQLite database at build time via a one-time seed script. The database SHALL precompute `distance_ly` (√(x²+y²+z²) × 3.26156) and `distance_pc` for every star. The seed script SHALL NOT run at request time.

#### Scenario: Stars queryable after seeding
- **WHEN** the seed script has completed
- **THEN** the SQLite database contains at least 100,000 star records with non-null `distance_ly` values

#### Scenario: Seed is idempotent
- **WHEN** the seed script is run a second time
- **THEN** the database is rebuilt cleanly without duplicate records

### Requirement: Famous stars curated list
The database SHALL include a curated set of at least 16 stars marked `is_famous = true` with a `famous_rank` integer for display ordering. Each famous star SHALL have a human-readable `blurb` field (e.g., "Destination in Project Hail Mary"). The famous stars list SHALL include at minimum: Proxima Centauri, Alpha Centauri, Barnard's Star, Sirius, Epsilon Eridani, Tau Ceti, Vega, Fomalhaut, Polaris, TRAPPIST-1, Kepler-452, Betelgeuse, Rigel, Deneb, Sagittarius A*.

#### Scenario: Famous stars endpoint returns ordered list
- **WHEN** a GET request is made to `/api/stars/famous`
- **THEN** the response contains all famous stars ordered by `famous_rank` ascending, each with `id`, `proper_name`, `distance_ly`, `spectral_type`, and `blurb`

### Requirement: Full-text star search
The backend SHALL expose a search endpoint using SQLite FTS5 over star names and Bayer designations. Search SHALL return up to 20 results ordered by relevance, then by distance ascending as a tiebreaker.

#### Scenario: Search finds star by proper name
- **WHEN** a GET request is made to `/api/stars/search?q=tau+ceti`
- **THEN** the star with `proper_name = "Tau Ceti"` appears in the results

#### Scenario: Search finds star by partial name
- **WHEN** a GET request is made to `/api/stars/search?q=proxima`
- **THEN** Proxima Centauri appears in the top 3 results

#### Scenario: Empty query returns empty results
- **WHEN** a GET request is made to `/api/stars/search?q=`
- **THEN** the response returns an empty array

### Requirement: Single star detail endpoint
The backend SHALL expose an endpoint returning full details for a single star by ID, including its 3D position (x, y, z in parsecs), all precomputed fields, and the `blurb` if present.

#### Scenario: Star detail returned by ID
- **WHEN** a GET request is made to `/api/stars/42`
- **THEN** the response includes `id`, `proper_name`, `x`, `y`, `z`, `distance_ly`, `spectral_type`, `magnitude`, `is_famous`, and `blurb`

#### Scenario: Unknown ID returns 404
- **WHEN** a GET request is made to `/api/stars/9999999`
- **THEN** the response status is 404

### Requirement: Nearby stars endpoint
The backend SHALL expose an endpoint returning all stars within a given distance from Earth in light-years, with a maximum of 5,000 results.

#### Scenario: Nearby stars filtered by distance
- **WHEN** a GET request is made to `/api/stars/nearby?ly=20`
- **THEN** all returned stars have `distance_ly <= 20` and the response contains at least the Sun, Proxima Centauri, and Alpha Centauri

#### Scenario: Result count capped
- **WHEN** a GET request is made to `/api/stars/nearby?ly=10000`
- **THEN** the response contains at most 5,000 stars
