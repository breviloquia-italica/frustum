import { Controller } from "@hotwired/stimulus";
import { assert } from "console";

const MAP_URL = {
  municipalities:
    "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_municipalities.geojson",
  provinces:
    "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_provinces.geojson",
  regions:
    "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson",
};

import * as d3 from "d3";

export default class extends Controller {
  static targets = ["container"];
  declare readonly containerTarget: HTMLDivElement;

  projection!: d3.GeoProjection;
  dots!: d3.Selection<SVGGElement, unknown, null, undefined>;

  async connect() {
    const bb = (await d3.json<d3.ExtendedFeatureCollection>(MAP_URL.regions))!;
    this.projection = d3.geoEqualEarth();
    this.projection.fitExtent(
      [
        [20, 20],
        [this.containerTarget.clientWidth, this.containerTarget.clientHeight],
      ],
      bb
    );
    const geoGenerator = d3.geoPath().projection(this.projection);
    const svg = d3
      .select(this.containerTarget)
      .append("svg")
      .style("width", "100%")
      .style("height", "100%");
    svg
      .append("g")
      .selectAll("path")
      .data(bb.features)
      .enter()
      .append("path")
      .attr("d", geoGenerator)
      .attr("fill", "#ABF")
      .attr("stroke", "#FFF")
      .attr("stroke-width", ".5px");
    this.dots = d3
      .select(this.containerTarget)
      .select("svg")
      .append("g")
      .attr("class", "dots");
  }

  disconnect() {
    console.log("asd");
  }

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
    this.dots
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => this.projection([d.longitude, d.latitude])![0])
      .attr("cy", (d) => this.projection([d.longitude, d.latitude])![1])
      .attr("r", 1) // Radius of the dots
      .attr("fill", "red"); // Color of the dots
  }

  updateFilter({
    detail: { selectedWords },
  }: CustomEvent<{
    selectedWords: string[];
  }>) {
    const selectedSet = new Set(selectedWords);
    this.dots.selectAll("circle").attr("visibility", (d: any) => {
      return selectedSet.has(d.word) ? "visible" : "hidden";
    });
  }

  updateTimeFilter({
    detail: { timespan },
  }: CustomEvent<{
    timespan: [Date, Date] | null;
  }>) {
    let timeFilter: (d: { epoch: number }) => boolean;
    if (timespan === null) {
      timeFilter = () => true;
    } else {
      // NOTE: comparing millis is much faster
      const s = timespan[0].getTime();
      const t = timespan[1].getTime();
      timeFilter = (d) => d.epoch >= s && d.epoch <= t;
    }
    this.dots.selectAll("circle").attr("visibility", (d: any) => {
      return timeFilter(d) ? "visible" : "hidden";
    });
  }
}
