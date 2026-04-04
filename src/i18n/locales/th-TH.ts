export default {
  pages: {},
  components: {
    rss: {
      recentNotes: "บันทึกล่าสุด",
      lastFewNotes: ({ count }: { count: number }) => `${count} บันทึกล่าสุด`,
    },
  },
};
