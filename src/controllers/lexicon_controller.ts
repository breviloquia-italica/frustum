import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import { DatasetRow } from "./main_controller";
import { buildLandFilter, buildTimeFilter } from "../utils";

export default class extends Controller {
  static targets = ["select"];
  declare readonly selectTarget: HTMLSelectElement;

  timeFilter = buildTimeFilter(null);
  landFilter = buildLandFilter(null);

  facet: DatasetRow[] = [];

  async connect() {
    this.selectTarget.addEventListener("change", () => {
      const wordlist = Array.from(this.selectTarget.selectedOptions).map(
        (option) => option.value,
      );
      this.dispatch("wordlistChanged", {
        detail: { wordlist },
      });
    });
  }

  disconnect() {}

  reloadDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    // TODO: sort
    this.facet = dataset;
    this.redraw();
  }

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

  updateFilter({
    detail: { landarea, timespan },
  }: CustomEvent<{
    timespan: [Date, Date] | null;
    landarea: [[number, number], [number, number]] | null;
  }>) {
    this.timeFilter = buildTimeFilter(timespan);
    this.landFilter = buildLandFilter(landarea);
    this.redraw();
  }
}
