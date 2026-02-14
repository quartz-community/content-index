# @quartz-community/content-index

Generates a sitemap, RSS feed, and content index JSON for full-text search.

## Installation

```bash
npx quartz plugin add github:quartz-community/content-index
```

## Usage

```ts
// quartz.config.ts
import * as ExternalPlugin from "./.quartz/plugins";

const config: QuartzConfig = {
  plugins: {
    emitters: [ExternalPlugin.ContentIndex()],
  },
};
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

See the [Quartz documentation](https://quartz.jzhao.xyz/) for more information.

## License

MIT
