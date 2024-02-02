import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import { AggregationKey, DatasetRow } from "./main_controller";
import {
  buildWordFilter,
  FilterChangeEvent,
  LandFilter,
  TimeFilter,
  WordFilter,
} from "../filter";

export default class extends Controller {
  static targets = ["select"];
  declare readonly selectTarget: HTMLSelectElement;

  facet: DatasetRow[] = [];

  async connect() {
    this.initBrush();
  }

  disconnect() {}

  redraw() {
    const filteredData = this.facet
      .filter((d) => this.timeFilter(d))
      .filter((d) => this.landFilter(d));

    const key = this.aggregationKey;
    let counter: (bin: DatasetRow[]) => number;
    if (key === null) {
      counter = (bin) => bin.length;
    } else {
      counter = (bin) => new Set(bin.map((p) => p[key])).size;
    }

    const countByWord = d3.rollup(
      filteredData,
      (v) => counter(v),
      (d) => d.word,
    );

    const sorted = Array.from(countByWord)
      .sort(([a], [b]) => a.localeCompare(b))
      .sort(([, a], [, b]) => b - a);

    d3.select(this.selectTarget)
      .selectAll<HTMLOptionElement, [string, number]>("option")
      .data(sorted, ([k]) => k)
      .join(
        (enter) => {
          return enter
            .append("option")
            .attr("value", ([k]) => k)
            .attr("count", ([, v]) => v)
            .text(([k]) => k);
        },
        (update) => {
          return update.attr("count", ([, v]) => v);
        },
        (exit) => {
          return exit.attr("count", "0");
        },
      );
  }

  //=[ DATA INGESTION ]=========================================================

  updateDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    // TODO: sort
    this.facet = dataset;
    this.redraw();
  }

  //=[ BRUSHING ]===============================================================

  // NOTE: technically not brushing, but whatever.

  initBrush() {
    this.selectTarget.addEventListener(
      "change",
      this.handleBrushEvent.bind(this),
    );
  }

  handleBrushEvent() {
    const selectedOptions = Array.from(this.selectTarget.selectedOptions);
    const wordlist = selectedOptions.map((option) => option.value);
    this.changeWordFilter(wordlist);
  }

  //=[ FILTERING ]==============================================================

  landFilter: LandFilter = () => true;
  timeFilter: TimeFilter = () => true;
  wordFilter: WordFilter = () => true;

  updateFilter({ detail: { landFilter, timeFilter } }: FilterChangeEvent) {
    if (landFilter) this.landFilter = landFilter;
    if (timeFilter) this.timeFilter = timeFilter;
    this.redraw();
  }
  changeWordFilter(wordlist: string[] | null) {
    this.wordFilter = buildWordFilter(wordlist);
    this.dispatch("filterChanged", {
      detail: { wordFilter: this.wordFilter },
    });
  }

  //=[ AGGREGATION ]============================================================

  aggregationKey: AggregationKey = null;

  updateCounter({
    detail: { aggregationKey },
  }: CustomEvent<{
    aggregationKey: AggregationKey;
  }>) {
    this.aggregationKey = aggregationKey;
    this.redraw();
  }
}
