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

export const buildLandFilter = function (
  landarea: [[number, number], [number, number]] | null,
) {
  let landFilter: (d: { latitude: number; longitude: number }) => boolean;
  if (landarea === null) {
    landFilter = () => true;
  } else {
    // NOTE: note the inequalities on latitude are inverted because we're in the northern hemisphere.
    // TODO: is there some d3 helper to do this in one line?
    landFilter = (d) =>
      d.longitude >= landarea[0][0] &&
      d.longitude <= landarea[1][0] &&
      d.latitude <= landarea[0][1] &&
      d.latitude >= landarea[1][1];
  }
  return landFilter;
};
