import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";

const DATA_URL =
  "https://gist.githubusercontent.com/paolobrasolin/ca6595469258bca83937edd4f5770f5d/raw/frustum-demo-full.csv";

export type DatasetRow = {
  tweet_id: number;
  user_id: string;
  time: number;
  latitude: number;
  longitude: number;
  word: string;
};

export type AggregationKey = null | "tweet_id" | "user_id";

export default class extends Controller {
  static targets = ["fileInput"];
  declare readonly fileInputTarget: HTMLInputElement;

  connect(): void {
    setTimeout(() => {
      d3.csv(DATA_URL, this.convertCsvRow).then((dataset) => {
        this.dispatch("datasetChanged", { detail: { dataset } });
      });
    }, 500);
  }

  async changeDataset(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log(`File name: ${file.name}`);
      console.log(`File size: ${file.size} bytes`);

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const content = e.target?.result as string;
        this.handleData(content);
      };
      reader.readAsText(file);
    }
  }

  async changeCounter(event: Event) {
    const input = event.target as HTMLSelectElement;
    const aggregationKey = (input.value ? input.value : null) as AggregationKey;
    this.dispatch("counterChanged", {
      detail: { aggregationKey },
    });
  }

  handleData(csv: string) {
    const dataset = d3.csvParse(csv, this.convertCsvRow);
    this.dispatch("datasetChanged", { detail: { dataset } });
  }

  convertCsvRow({
    tweet_id,
    user_id,
    timestamp,
    latitude,
    longitude,
    word,
  }: {
    tweet_id: string;
    user_id: string;
    timestamp: string;
    latitude: string;
    longitude: string;
    word: string;
  }): DatasetRow {
    return {
      tweet_id: +tweet_id,
      user_id: user_id, // BigInt("0x" + user_id.replace(/-/g, "")),
      time: new Date(timestamp).getTime(),
      latitude: +latitude,
      longitude: +longitude,
      word: word,
    };
  }
}
