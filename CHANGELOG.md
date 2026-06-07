# Changelog

All notable changes to Your News are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Production documentation suite (`docs/`)
- Vitest unit test infrastructure and CI workflow
- GitHub issue and pull request templates
- Comprehensive `.env.example` with grouped variables
- API v1 routes for mobile (`/api/v1/*`)

### Changed

- For You briefing quality: corpus-driven headlines, watch, and action text
- Story intelligence quality gates to prevent article text leakage
- Coverage period labels derived from briefing corpus dates

## [0.1.0] - 2026-06-03

### Added

- Next.js web dashboard with Clerk authentication
- AI intelligence briefings (Global + For You)
- Signals feed with momentum scoring
- User Intelligence Profile (UIP) and topic preferences
- Saved stories
- Expo mobile app (iOS/Android) consuming API v1
- Redis/KV persistence for intelligence snapshots and user data
- Multi-user isolation verification script

[Unreleased]: https://github.com/your-org/your-news/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/your-news/releases/tag/v0.1.0
