import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Root as HastRoot, Element } from "hast";
import { VFile } from "vfile";
import { ContentIndex } from "../src/emitter";
import type {
  BuildCtx,
  ProcessedContent,
  QuartzConfig,
  StaticResources,
  FullSlug,
} from "@quartz-community/types";

function createCtx(outputDir: string): BuildCtx {
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
    cfg: {
      configuration: {
        baseUrl: "example.com",
        pageTitle: "Test Site",
      },
    } as QuartzConfig,
    allSlugs: [],
    allFiles: [],
    incremental: false,
  };
}

function createResources(): StaticResources {
  return { css: [], js: [], additionalHead: [] };
}

interface PageOptions {
  slug: string;
  title?: string;
  text?: string;
  tags?: string[];
  links?: string[];
  unlisted?: boolean;
  encrypted?: boolean;
}

function createPage(opts: PageOptions): ProcessedContent {
  const tree: HastRoot = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "article",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [{ type: "text", value: opts.text ?? "hello" }],
          },
        ],
      } as Element,
    ],
  };
  const vfile = new VFile("");
  const data: Record<string, unknown> = {
    slug: opts.slug,
    relativePath: `${opts.slug}.md`,
    text: opts.text ?? "",
    description: "",
    links: opts.links ?? [],
    frontmatter: {
      title: opts.title ?? opts.slug,
      tags: opts.tags ?? [],
    },
  };
  if (opts.unlisted) data.unlisted = true;
  if (opts.encrypted) data.encrypted = true;
  vfile.data = data;
  return [tree, vfile];
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

describe("ContentIndex emitter", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-index-test-"));
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  it("includes non-unlisted pages in contentIndex.json", async () => {
    const emitter = ContentIndex();
    const content: ProcessedContent[] = [createPage({ slug: "public", text: "hi" })];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, { title: string }>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["public"]!.title).toBe("public");
  });

  it("excludes unlisted pages from contentIndex.json", async () => {
    const emitter = ContentIndex();
    const content: ProcessedContent[] = [
      createPage({ slug: "public", text: "hi" }),
      createPage({ slug: "hidden", text: "secret", unlisted: true }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, unknown>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["hidden"]).toBeUndefined();
  });

  it("excludes unlisted pages from sitemap.xml", async () => {
    const emitter = ContentIndex();
    const content: ProcessedContent[] = [
      createPage({ slug: "public", text: "hi" }),
      createPage({ slug: "hidden", text: "secret", unlisted: true }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const sitemap = await fs.readFile(path.join(outputDir, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("public");
    expect(sitemap).not.toContain("hidden");
  });

  it("excludes unlisted pages from RSS feed", async () => {
    const emitter = ContentIndex();
    const content: ProcessedContent[] = [
      createPage({ slug: "public", title: "Public Page", text: "hi" }),
      createPage({ slug: "hidden", title: "Hidden Page", text: "secret", unlisted: true }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const rss = await fs.readFile(path.join(outputDir, "index.xml"), "utf8");
    expect(rss).toContain("Public Page");
    expect(rss).not.toContain("Hidden Page");
  });

  it("does not emit richContent for encrypted pages even when rssFullHtml is true", async () => {
    const emitter = ContentIndex({ rssFullHtml: true });
    const content: ProcessedContent[] = [
      createPage({ slug: "public", text: "hi" }),
      createPage({ slug: "encrypted-visible", text: "", encrypted: true }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, { richContent?: string; content: string }>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["public"]!.richContent).toBeTruthy();

    expect(index["encrypted-visible"]).toBeDefined();
    expect(index["encrypted-visible"]!.richContent).toBeUndefined();
  });

  it("still emits encrypted-but-not-unlisted pages in the index", async () => {
    const emitter = ContentIndex();
    const content: ProcessedContent[] = [
      createPage({ slug: "encrypted-visible", title: "Locked", encrypted: true }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, { title: string }>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["encrypted-visible"]).toBeDefined();
    expect(index["encrypted-visible"]!.title).toBe("Locked");
  });

  it("excludes pages without a relativePath from every output by default", async () => {
    const emitter = ContentIndex();
    const malformedPage = createPage({ slug: "broken", title: "Broken Page" });
    delete malformedPage[1].data.relativePath;
    const content: ProcessedContent[] = [
      createPage({ slug: "public", title: "Public Page", text: "hi" }),
      malformedPage,
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, unknown>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["broken"]).toBeUndefined();

    const sitemap = await fs.readFile(path.join(outputDir, "sitemap.xml"), "utf8");
    expect(sitemap).not.toContain("broken");

    const rss = await fs.readFile(path.join(outputDir, "index.xml"), "utf8");
    expect(rss).toContain("Public Page");
    expect(rss).not.toContain("Broken Page");
  });

  it("includes virtual (non-file-backed) pages in the sitemap and contentIndex.json, but not the RSS feed, by default", async () => {
    const emitter = ContentIndex();
    // Virtual pages (tag/folder pages generated by Quartz) still get a synthesized
    // relativePath, but their slug is absent from ctx.allSlugs since no real file backs them.
    const virtualPage = createPage({ slug: "tags/test", title: "Test Tag" });
    const content: ProcessedContent[] = [
      createPage({ slug: "public", title: "Public Page", text: "hi" }),
      virtualPage,
    ];
    const ctx = createCtx(outputDir);
    ctx.allSlugs = ["public" as FullSlug];
    await emitter.emit(ctx, content, createResources());

    const index = await readJson<Record<string, unknown>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["tags/test"]).toBeDefined();

    const sitemap = await fs.readFile(path.join(outputDir, "sitemap.xml"), "utf8");
    expect(sitemap).toContain("tags/test");

    const rss = await fs.readFile(path.join(outputDir, "index.xml"), "utf8");
    expect(rss).toContain("Public Page");
    expect(rss).not.toContain("Test Tag");
  });

  it("allows custom filter function to customize which pages are indexed", async () => {
    const emitter = ContentIndex({
      filter: (v) => v[1].data.slug === "keep-me",
    });
    const content: ProcessedContent[] = [
      createPage({ slug: "keep-me", title: "Keep Me", text: "hi" }),
      createPage({ slug: "filter-me", title: "Filter Me", text: "bye" }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, unknown>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["keep-me"]).toBeDefined();
    expect(index["filter-me"]).toBeUndefined();
  });

  it("allows custom rssFilter function to customize which indexed pages reach the RSS feed", async () => {
    const emitter = ContentIndex({
      rssFilter: (v) => v[1].data.slug === "public",
    });
    const content: ProcessedContent[] = [
      createPage({ slug: "public", title: "Public Page", text: "hi" }),
      createPage({ slug: "tags/test", title: "Test Tag", text: "hi" }),
    ];
    await emitter.emit(createCtx(outputDir), content, createResources());

    const index = await readJson<Record<string, unknown>>(
      path.join(outputDir, "static", "contentIndex.json"),
    );
    expect(index["public"]).toBeDefined();
    expect(index["tags/test"]).toBeDefined();

    const rss = await fs.readFile(path.join(outputDir, "index.xml"), "utf8");
    expect(rss).toContain("Public Page");
    expect(rss).not.toContain("Test Tag");
  });
});
