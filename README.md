# @quartz-community/content-index

Generates a sitemap, RSS feed, and content index JSON for full-text search.

> [!IMPORTANT]
> **Built into Quartz 5.1+.** The content index, sitemap and RSS feed are part of Quartz core now, configured under
> `configuration.contentIndex` in `quartz.config.yaml` — you don't need this plugin anymore.
> Existing config entries for it keep working (Quartz applies their options to the built-in and
> doesn't load this package); run `npx quartz plugin doctor --fix` to update your config.
> See [Built-in processing](https://quartz.jzhao.xyz/features/built-in-processing).
> This package is kept for Quartz versions before 5.1.

## Installation

```bash
npx quartz plugin add github:quartz-community/content-index
```

## Usage

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/content-index
    enabled: true
    options:
      enableSiteMap: true
      enableRSS: true
```

For advanced use cases, you can override in TypeScript:

```ts title="quartz.ts (override)"
import * as ExternalPlugin from "./.quartz/plugins";

ExternalPlugin.ContentIndex({
  enableSiteMap: true,
  enableRSS: true,
  rssLimit: 10,
  rssFullHtml: false,
  rssSlug: "index",
  includeEmptyFiles: true,
});
```

## Configuration

| Option              | Type      | Default   | Description                                           |
| ------------------- | --------- | --------- | ----------------------------------------------------- |
| `enableSiteMap`     | `boolean` | `true`    | Whether to generate a sitemap.xml file.               |
| `enableRSS`         | `boolean` | `true`    | Whether to generate an RSS feed.                      |
| `rssLimit`          | `number`  | `10`      | Maximum number of items to include in the RSS feed.   |
| `rssFullHtml`       | `boolean` | `false`   | Whether to include full HTML content in the RSS feed. |
| `rssSlug`           | `string`  | `"index"` | The slug for the RSS feed file.                       |
| `includeEmptyFiles` | `boolean` | `true`    | Whether to include empty files in the content index.  |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/ContentIndex) for more information.

## License

MIT
