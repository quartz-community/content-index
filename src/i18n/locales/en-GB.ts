export default {
  pages: {},
  components: {
    rss: {
      recentNotes: "Recent notes",
      lastFewNotes: ({ count }: { count: number }) => `Last ${count} notes`,
    },
  },
};
