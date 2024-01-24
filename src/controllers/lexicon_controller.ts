import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import { DatasetRow } from "./main_controller";
import { buildLandFilter, buildTimeFilter } from "../utils";

export default class extends Controller {
  static targets = ["select"];
  declare readonly selectTarget: HTMLSelectElement;

  timeFilter = buildTimeFilter(null);
  landFilter = buildLandFilter(null);

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
    const countByWord = d3.rollup(
      dataset,
      (v) => v.length,
      (d) => d.word,
    );

    this.selectTarget.innerHTML = "";
    // Sort the countByWord map by count in descending order
    const sortedWords = Array.from(countByWord.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    // Create and append options to the selectTarget
    sortedWords.forEach(([word, count]) => {
      const option = document.createElement("option");
      option.value = word;
      option.textContent = `${word} (${count})`;
      this.selectTarget.appendChild(option);
    });
  }

  updateFilter({
    detail: { landarea, timespan },
  }: CustomEvent<{
    timespan: [Date, Date] | null;
    landarea: [[number, number], [number, number]] | null;
  }>) {
    this.timeFilter = buildTimeFilter(timespan);
    this.landFilter = buildLandFilter(landarea);
    // TODO
  }
}
