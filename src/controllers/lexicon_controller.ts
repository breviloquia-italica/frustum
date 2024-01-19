import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";

export default class extends Controller {
  static targets = ["select"];
  declare readonly selectTarget: HTMLSelectElement;

  async connect() {
    this.selectTarget.addEventListener("change", () => {
      const selectedWords = Array.from(this.selectTarget.selectedOptions).map(
        (option) => option.value
      );
      this.dispatch("wordlistChanged", {
        detail: { selectedWords },
      });
    });
  }

  disconnect() {}

  reloadDataset({
    detail: { data },
  }: CustomEvent<{
    data: {
      timestamp: Date;
      day: string;
      latitude: number;
      longitude: number;
      word: string;
    }[];
  }>) {
    const countByWord = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.word
    );

    this.selectTarget.innerHTML = "";
    // Sort the countByWord map by count in descending order
    const sortedWords = Array.from(countByWord.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    // Create and append options to the selectTarget
    sortedWords.forEach(([word, count]) => {
      const option = document.createElement("option");
      option.value = word;
      option.textContent = `${word} (${count})`;
      this.selectTarget.appendChild(option);
    });
  }
}
