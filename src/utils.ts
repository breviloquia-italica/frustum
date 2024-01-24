export const buildWordFilter = function (wordlist: string[] | null) {
  let wordFilter: (d: { word: string }) => boolean;
  if (wordlist === null || wordlist === undefined || wordlist.length < 1) {
    wordFilter = () => true;
  } else {
    const selectedSet = new Set(wordlist);
    wordFilter = (d) => selectedSet.has(d.word);
  }
  return wordFilter;
};

export const buildTimeFilter = function (timespan: [Date, Date] | null) {
  let timeFilter: (d: { time: number }) => boolean;
  if (timespan === null || timespan === undefined) {
    timeFilter = () => true;
  } else {
    // NOTE: comparing millis is much faster
    const s = timespan[0].getTime();
    const t = timespan[1].getTime();
    timeFilter = (d) => d.time >= s && d.time <= t;
  }
  return timeFilter;
};
