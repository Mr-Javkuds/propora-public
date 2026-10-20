# Runtime data sources — historical summary

This English summary reflects the October 16, 2026 assessment of the original development environment. It does not certify the current deployment.

| Area | Runtime source |
| --- | --- |
| Search, homepage, recommendations | Available listings in Supabase with price, radius, and amenity filters |
| Detail and comparison | Listing records and stored `listing_analyses` |
| Location analysis | Database recommendations rather than fabricated fallback locations |
| Applications and rental status | Application records linked to listings and users |
| Payments | Simulated receipts stored in `applications.payment` |
| Chat, visits, documents | Messages, surveys, document records, and private Storage |

SQLite seed data is not the marketplace runtime database. ML environmental features are reference/proxy data. Sample listings and illustration images should be distinguished from independently verified properties. Payment records do not represent real money transfers.

See the [data audit summary](../DATA-INTEGRITY-AUDIT.md) and [known security findings](security-audit-2026-10-19.md). Historical behavior through application endpoints does not establish that direct Data API/RPC writes are equally constrained.
