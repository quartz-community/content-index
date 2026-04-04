export default {
  pages: {},
  components: {
    rss: {
      recentNotes: "Note recenti",
      lastFewNotes: ({ count }: { count: number }) =>
        count === 1 ? "Ultima nota" : `Ultime ${count} note`,
    },
  },
};
