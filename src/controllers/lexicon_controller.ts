import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import { DatasetRow } from "./main_controller";
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
    const countByWord = d3.rollup(
      this.facet
        .filter((d) => this.timeFilter(d))
        .filter((d) => this.landFilter(d)),
      (v) => v.length,
      (d) => d.word,
    );

    d3.select(this.selectTarget)
      .selectAll("option")
      .data(countByWord)
      .join(
        (enter: any) => {
          return enter
            .append("option")
            .attr("value", ([k, v]: [string, number]) => k)
            .attr("count", ([k, v]: [string, number]) => v)
            .text(([k, v]: [string, number]) => k);
        },
        (update: any) => {
          return update.attr("count", ([k, v]: [string, number]) => v);
        },
        (exit: any) => {
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
}
