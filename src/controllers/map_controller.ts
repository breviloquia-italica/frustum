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
import { Hexbin, hexbin } from "d3-hexbin";
import { buildTimeFilter, buildWordFilter } from "../utils";

export default class extends Controller {
  static targets = ["container"];
  declare readonly containerTarget: HTMLDivElement;

  projection!: d3.GeoProjection;
  hexbin!: Hexbin<[number, number]>;
  svg!: any;

  dataset: {
    timestamp: Date;
    day: string;
    latitude: number;
    longitude: number;
    word: string;
    epoch: number;
    x: number;
    y: number;
  }[] = [];

  timeFilter = buildTimeFilter(null);
  wordFilter = buildWordFilter(null);

  async connect() {
    const extent: [[number, number], [number, number]] = [
      [0, 0],
      [this.containerTarget.clientWidth, this.containerTarget.clientHeight],
    ];

    const bb = (await d3.json<d3.ExtendedFeatureCollection>(MAP_URL.regions))!;
    this.projection = d3.geoEqualEarth();
    this.projection.fitExtent(extent, bb);
    const geoGenerator = d3.geoPath().projection(this.projection);
    this.svg = d3
      .select(this.containerTarget)
      .append("svg")
      .style("width", "100%")
      .style("height", "100%");
    this.svg
      .append("g")
      .attr("id", "italy")
      .selectAll("path")
      .data(bb.features)
      .enter()
      .append("path")
      .attr("d", geoGenerator);

    this.hexbin = hexbin().radius(6).extent(extent);
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
      epoch: number;
    }[];
  }>) {
    const bins: number[] = Array(10000).fill(0);
    this.dataset = data.map((d) => {
      const [x, y] = this.projection([d.longitude, d.latitude])!;
      bins[Math.floor(x / 6) + Math.floor(y / 6) * 1000] += 1;
      return { ...d, x, y };
    });
    this.redrawheat();

    this.svg.append("g").attr("id", "hexbins");
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
    this.redrawheat();
  }

  redrawheat() {
    const dee = this.dataset
      .filter(this.wordFilter)
      .filter(this.timeFilter)
      .map(({ x, y }) => [x, y]);
    const mx = Math.max(...this.hexbin(dee).map((h) => h.length), 0);
    const color = d3
      .scaleLinear()
      .domain([0, mx]) // Number of points in the bin?
      .range(["blue", "red"]);

    this.svg
      .select("#hexbins")
      .selectAll("path")
      .data(this.hexbin(dee))
      .join(
        (enter: any) => {
          return enter
            .append("path")
            .attr("d", this.hexbin.hexagon())
            .attr("transform", function (d: any) {
              return "translate(" + d.x + "," + d.y + ")";
            })
            .attr("fill", function (d: any) {
              return color(d.length);
            });
        },
        (update: any) => {
          return update
            .attr("fill", function (d: any) {
              return color(d.length);
            })
            .attr("transform", function (d: any) {
              return "translate(" + d.x + "," + d.y + ")";
            });
        },
        (exit: any) => {
          return exit.remove();
        }
      );
  }
}
