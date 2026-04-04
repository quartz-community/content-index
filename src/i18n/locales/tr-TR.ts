export default {
  pages: {},
  components: {
    rss: {
      recentNotes: "Son notlar",
      lastFewNotes: ({ count }: { count: number }) => `Son ${count} not`,
    },
  },
};
