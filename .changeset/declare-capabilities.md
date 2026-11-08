---
"@quartz-community/content-index": patch
---

The manifest declares what the plugin provides and uses (`quartz.capabilities`): it provides `static/contentIndex.json` and optionally uses links, page text and parsed frontmatter. Quartz 5.1+ reports missing providers at build time; older versions ignore the field. On Quartz 5.1+ the content index is built in (`configuration.contentIndex`); the README explains the migration.
