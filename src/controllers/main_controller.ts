import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";

export default class extends Controller {
  static targets = ["fileInput"];
  declare readonly fileInputTarget: HTMLInputElement;

  connect(): void {
    setTimeout(() => {
      d3.csv(
        "https://gist.githubusercontent.com/paolobrasolin/ca6595469258bca83937edd4f5770f5d/raw/frustum-demo-large.csv",
        ({ timestamp, latitude, longitude, word }) => ({
          timestamp: new Date(timestamp),
          day: d3.timeFormat("%Y-%m-%d")(new Date(timestamp)),
          latitude: +latitude,
          longitude: +longitude,
          word: word,
          epoch: new Date(timestamp).getTime(),
        }),
      ).then((data) => {
        this.dispatch("datasetChanged", {
          detail: { data },
        });
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

  handleData(csv: string) {
    const data = d3.csvParse(
      csv,
      ({ timestamp, latitude, longitude, word }) => ({
        timestamp: new Date(timestamp),
        day: d3.timeFormat("%Y-%m-%d")(new Date(timestamp)),
        latitude: +latitude,
        longitude: +longitude,
        word: word,
        epoch: new Date(timestamp).getTime(),
      }),
    );
    this.dispatch("datasetChanged", {
      detail: { data },
    });
  }
}
