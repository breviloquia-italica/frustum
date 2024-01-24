export type LandFilter = (d: {
  latitude: number;
  longitude: number;
}) => boolean;
export type TimeFilter = (d: { time: number }) => boolean;
export type WordFilter = (d: { word: string }) => boolean;

export type FilterChangeEvent = CustomEvent<{
  landFilter?: LandFilter;
  timeFilter?: TimeFilter;
  wordFilter?: WordFilter;
}>;

export const buildWordFilter = function (
  wordlist: string[] | null,
): WordFilter {
  if (wordlist === null || wordlist === undefined || wordlist.length < 1) {
    return () => true;
  } else {
    const selectedSet = new Set(wordlist);
    return (d) => selectedSet.has(d.word);
  }
};

export const buildTimeFilter = function (
  timespan: [Date, Date] | null,
): TimeFilter {
  if (timespan === null || timespan === undefined) {
    return () => true;
  } else {
    // NOTE: comparing millis is much faster
    const s = timespan[0].getTime();
    const t = timespan[1].getTime();
    return (d) => d.time >= s && d.time <= t;
  }
};

export const buildLandFilter = function (
  landarea: [[number, number], [number, number]] | null,
): LandFilter {
  if (landarea === null) {
    return () => true;
  } else {
    // NOTE: note the inequalities on latitude are inverted because we're in the northern hemisphere.
    // TODO: is there some d3 helper to do this in one line?
    return (d) =>
      d.longitude >= landarea[0][0] &&
      d.longitude <= landarea[1][0] &&
      d.latitude <= landarea[0][1] &&
      d.latitude >= landarea[1][1];
  }
};
