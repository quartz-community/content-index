import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Root as HastRoot } from "hast";
import { VFile } from "vfile";
import { ContentIndex } from "../src/emitter";
import type {
  BuildCtx,
  ProcessedContent,
  QuartzConfig,
  StaticResources,
} from "@quartz-community/types";

function createCtx(
  outputDir: string,
  configuration: Record<string, unknown> = { baseUrl: "example.com", pageTitle: "Test Site" },
): BuildCtx {
  return {
    buildId: "test-build",
    argv: {
      directory: "content",
      verbose: false,
      output: outputDir,
      serve: false,
      watch: false,
      port: 0,
      wsPort: 0,
    },
    cfg: { configuration } as unknown as QuartzConfig,
    allSlugs: [],
    allFiles: [],
    incremental: false,
  };
}

const resources = (): StaticResources => ({ css: [], js: [], additionalHead: [] });

interface PageOptions {
  slug: string;
  title?: string;
  text?: string;
  description?: string;
  date?: string;
  tags?: string[];
  links?: string[];
  html?: string;
  raw?: string;
}

function page(opts: PageOptions): ProcessedContent {
  const tree: HastRoot = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value: opts.html ?? "body text" }],
      },
      // a `raw` node (embedded HTML)
      ...((opts.raw ? [{ type: "raw", value: opts.raw }] : []) as unknown as HastRoot["children"]),
    ],
  };
  const vfile = new VFile("");
  const data: Record<string, unknown> = {
    slug: opts.slug,
    relativePath: `${opts.slug}.md`,
    text: opts.text ?? "some text",
    description: opts.description ?? "",
    links: opts.links ?? [],
    frontmatter: { title: opts.title ?? opts.slug, tags: opts.tags ?? [] },
  };
  if (opts.date) {
    data.defaultDateType = "modified";
    data.dates = { modified: new Date(opts.date) };
  }
  vfile.data = data;
  return [tree, vfile];
}

describe("ContentIndex outputs", () => {
  let out: string;
  beforeEach(async () => {
    out = await fs.mkdtemp(path.join(os.tmpdir(), "content-index-out-"));
  });
  afterEach(async () => {
    await fs.rm(out, { recursive: true, force: true });
  });

  const read = (rel: string) => fs.readFile(path.join(out, rel), "utf8");
  const exists = (rel: string) =>
    fs.access(path.join(out, rel)).then(
      () => true,
      () => false,
    );
  const items = (rss: string) =>
    [...rss.matchAll(/<item>\s*<title>(.*?)<\/title>/g)].map((m) => m[1]);

  it("emits sitemap.xml, index.xml and static/contentIndex.json by default and returns their paths", async () => {
    const files = await ContentIndex().emit(createCtx(out), [page({ slug: "a" })], resources());
    expect((files as string[]).map((f) => path.relative(out, f)).sort()).toEqual(
      ["index.xml", "sitemap.xml", path.join("static", "contentIndex.json")].sort(),
    );
  });

  it("honours enableSiteMap: false and enableRSS: false", async () => {
    const files = await ContentIndex({ enableSiteMap: false, enableRSS: false }).emit(
      createCtx(out),
      [page({ slug: "a" })],
      resources(),
    );
    expect((files as string[]).map((f) => path.relative(out, f))).toEqual([
      path.join("static", "contentIndex.json"),
    ]);
    expect(await exists("sitemap.xml")).toBe(false);
    expect(await exists("index.xml")).toBe(false);
  });

  it("writes the feed at rssSlug, including nested slugs", async () => {
    await ContentIndex({ rssSlug: "feeds/rss" }).emit(
      createCtx(out),
      [page({ slug: "a", title: "A" })],
      resources(),
    );
    expect(await exists("index.xml")).toBe(false);
    expect(await read("feeds/rss.xml")).toContain("<title>A</title>");
  });

  it("builds absolute sitemap URLs under a baseUrl with a sub-path", async () => {
    await ContentIndex().emit(
      createCtx(out, { baseUrl: "example.com/sub", pageTitle: "T" }),
      [
        page({ slug: "index" }),
        page({ slug: "folder/index" }),
        page({ slug: "notes/my-note" }),
        page({ slug: "notes/café" }),
      ],
      resources(),
    );
    const sitemap = await read("sitemap.xml");
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      "https://example.com/sub/",
      "https://example.com/sub/folder/",
      "https://example.com/sub/notes/my-note",
      "https://example.com/sub/notes/caf%C3%A9",
    ]);
    expect(sitemap.startsWith('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')).toBe(
      true,
    );
  });

  it("uses the page's default date for sitemap <lastmod> and RSS <pubDate>", async () => {
    await ContentIndex().emit(
      createCtx(out),
      [page({ slug: "a", date: "2024-03-01T12:00:00Z" })],
      resources(),
    );
    expect(await read("sitemap.xml")).toContain("<lastmod>2024-03-01T12:00:00.000Z</lastmod>");
    expect(await read("index.xml")).toContain("<pubDate>Fri, 01 Mar 2024 12:00:00 GMT</pubDate>");
  });

  it("orders RSS items newest first, then undated pages alphabetically, and applies rssLimit", async () => {
    const content = [
      page({ slug: "old", title: "Old", date: "2020-01-01" }),
      page({ slug: "new", title: "New", date: "2024-01-01" }),
      page({ slug: "mid", title: "Mid", date: "2022-01-01" }),
    ];
    await ContentIndex({ rssLimit: 2 }).emit(createCtx(out), content, resources());
    const rss = await read("index.xml");
    expect(items(rss)).toEqual(["New", "Mid"]);
    expect(rss).toContain("<description>Last 2 notes on Test Site</description>");
    expect(rss).toContain("<link>https://example.com</link>");
    expect(rss).toContain("<link>https://example.com/new</link>");
    expect(rss).toContain("<guid>https://example.com/new</guid>");
  });

  it("defaults rssLimit to 10 items", async () => {
    const content = Array.from({ length: 12 }, (_, i) =>
      page({ slug: `p${i}`, title: `P${String(i).padStart(2, "0")}` }),
    );
    await ContentIndex().emit(createCtx(out), content, resources());
    const rss = await read("index.xml");
    expect(items(rss)).toHaveLength(10);
    expect(rss).toContain("Last 10 notes on Test Site");
  });

  it("includes every item with the 'Recent notes' text when rssLimit is unset", async () => {
    const content = Array.from({ length: 12 }, (_, i) => page({ slug: `p${i}` }));
    await ContentIndex({ rssLimit: undefined, rssRecentNotesText: "Newest" }).emit(
      createCtx(out),
      content,
      resources(),
    );
    const rss = await read("index.xml");
    expect(items(rss)).toHaveLength(12);
    expect(rss).toContain("<description>Newest on Test Site</description>");
  });

  it("uses rssLastFewNotesText for the channel description", async () => {
    await ContentIndex({ rssLimit: 3, rssLastFewNotesText: (n) => `Laatste ${n}` }).emit(
      createCtx(out),
      [page({ slug: "a" })],
      resources(),
    );
    expect(await read("index.xml")).toContain("<description>Laatste 3 on Test Site</description>");
  });

  it("escapes page and site titles in the feed", async () => {
    await ContentIndex().emit(
      createCtx(out, { baseUrl: "example.com", pageTitle: "Tom & <Jerry>" }),
      [page({ slug: "a", title: 'Fish & "Chips" <3' })],
      resources(),
    );
    const rss = await read("index.xml");
    expect(rss).toContain("<title>Tom &amp; &lt;Jerry&gt;</title>");
    expect(rss).toContain("<title>Fish &amp; &quot;Chips&quot; &lt;3</title>");
  });

  it("puts the description in the feed by default and the rendered HTML with rssFullHtml", async () => {
    const content = [
      page({ slug: "a", description: "A summary", html: "Full body", raw: "<em>raw</em>" }),
    ];
    await ContentIndex().emit(createCtx(out), content, resources());
    const plain = await read("index.xml");
    expect(plain).toContain("<![CDATA[ A summary ]]>");
    expect(plain).not.toContain("Full body");

    await ContentIndex({ rssFullHtml: true }).emit(createCtx(out), content, resources());
    const full = await read("index.xml");
    expect(full).toContain("<![CDATA[ &lt;p&gt;Full body&lt;/p&gt;&lt;em&gt;raw&lt;/em&gt; ]]>");
    expect(full).not.toContain("A summary");
  });

  it("drops pages without text when includeEmptyFiles is false (kept by default)", async () => {
    const content = [page({ slug: "full", text: "words" }), page({ slug: "empty", text: "" })];
    await ContentIndex().emit(createCtx(out), content, resources());
    expect(Object.keys(JSON.parse(await read("static/contentIndex.json")))).toEqual([
      "full",
      "empty",
    ]);

    await ContentIndex({ includeEmptyFiles: false }).emit(createCtx(out), content, resources());
    expect(Object.keys(JSON.parse(await read("static/contentIndex.json")))).toEqual(["full"]);
    expect(await read("sitemap.xml")).not.toContain("empty");
    expect(await read("index.xml")).not.toContain("empty");
  });

  it("writes the search index entries the client expects, without date or description", async () => {
    await ContentIndex().emit(
      createCtx(out),
      [
        page({
          slug: "notes/a",
          title: "A",
          text: "hello world",
          description: "desc",
          date: "2024-01-01",
          tags: ["x", "y"],
          links: ["notes/b"],
        }),
      ],
      resources(),
    );
    const index = JSON.parse(await read("static/contentIndex.json"));
    expect(index).toEqual({
      "notes/a": {
        slug: "notes/a",
        filePath: "notes/a.md",
        title: "A",
        links: ["notes/b"],
        tags: ["x", "y"],
        content: "hello world",
      },
    });
  });

  it("produces the same files from partialEmit", async () => {
    const emitter = ContentIndex();
    const files = await emitter.partialEmit!(
      createCtx(out),
      [page({ slug: "a", title: "A" })],
      resources(),
      [],
    );
    expect(files).toHaveLength(3);
    expect(await read("index.xml")).toContain("<title>A</title>");
  });
});
