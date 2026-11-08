# Changelog

## 1.0.1

### Patch Changes

- 383d954: The manifest declares what the plugin provides and uses (`quartz.capabilities`): it provides `static/contentIndex.json` and optionally uses links, page text and parsed frontmatter. Quartz 5.1+ reports missing providers at build time; older versions ignore the field. On Quartz 5.1+ the content index is built in (`configuration.contentIndex`); the README explains the migration.

## 1.0.0

### Major Changes

- Stable 1.0 release. All `@quartz-community/*` dependencies now use `^1.0.0` ranges.

  Pre-1.0 caret ranges pinned the minor version (`^0.2.1` means `>=0.2.1 <0.3.0`), so
  published fixes to shared packages could never be resolved by dependents. Moving the
  ecosystem to 1.0 makes caret ranges behave conventionally.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Respect the `file.data.unlisted` convention. Pages marked `unlisted` are skipped entirely — they do not appear in `contentIndex.json`, RSS, or sitemap. Used by `@quartz-community/encrypted-pages` to hide encrypted pages from discovery surfaces while keeping their HTML accessible by direct URL.
- Skip `richContent` for pages marked `file.data.encrypted === true` even when `rssFullHtml: true` is set. Prevents the ciphertext blob from bloating RSS feeds.
- Test suite with coverage for unlisted/encrypted exclusion behavior.

- Initial Quartz community plugin template.
