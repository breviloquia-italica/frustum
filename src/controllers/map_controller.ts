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
import { buildTimeFilter, buildWordFilter } from "../utils";

export default class extends Controller {
  static targets = ["container"];
  declare readonly containerTarget: HTMLDivElement;

  projection!: d3.GeoProjection;
  dots!: d3.Selection<SVGGElement, unknown, null, undefined>;

  timeFilter = buildTimeFilter(null);
  wordFilter = buildWordFilter(null);

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

  updateWordlist({
    detail: { wordlist },
  }: CustomEvent<{
    wordlist: string[];
  }>) {
    this.wordFilter = buildWordFilter(wordlist);
    this.applyFilter();
  }

  updateTimespan({
    detail: { timespan },
  }: CustomEvent<{
    timespan: [Date, Date] | null;
  }>) {
    this.timeFilter = buildTimeFilter(timespan);
    this.applyFilter();
  }

  applyFilter() {
    this.dots.selectAll("circle").attr("visibility", (d: any) => {
      const visible = this.wordFilter(d) && this.timeFilter(d);
      return visible ? "visible" : "hidden";
    });
  }
}
