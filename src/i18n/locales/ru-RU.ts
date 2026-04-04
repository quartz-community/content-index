export default {
  pages: {},
  components: {
    rss: {
      recentNotes: "Недавние заметки",
      lastFewNotes: ({ count }: { count: number }) =>
        `Последн${getForm(count, "яя", "ие", "ие")} ${count} замет${getForm(count, "ка", "ки", "ок")}`,
    },
  },
};

function getForm(number: number, form1: string, form2: string, form5: string): string {
  const remainder100 = number % 100;
  const remainder10 = remainder100 % 10;

  if (remainder100 >= 10 && remainder100 <= 20) return form5;
  if (remainder10 > 1 && remainder10 < 5) return form2;
  if (remainder10 == 1) return form1;
  return form5;
}
