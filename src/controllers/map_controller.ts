import { Controller } from "@hotwired/stimulus";
import { assert } from "console";

import * as simpleheat from "simpleheat";

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
  static targets = ["container", "heatCanvas"];
  declare readonly containerTarget: HTMLDivElement;
  declare readonly heatCanvasTarget: HTMLCanvasElement;

  projection!: d3.GeoProjection;
  dots!: d3.Selection<SVGGElement, unknown, null, undefined>;
  heat!: any;

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
    this.heat = simpleheat(this.heatCanvasTarget);
    this.heatCanvasTarget.style.width = "100%";
    this.heatCanvasTarget.style.height = "100%";
    // ...then set the internal size to match
    this.heatCanvasTarget.width = this.heatCanvasTarget.offsetWidth;
    this.heatCanvasTarget.height = this.heatCanvasTarget.offsetHeight;
    this.heat.resize();
    this.heat.radius(3, 6);

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
      .attr("fill", "#BBB")
      .attr("stroke", "#FFF")
      .attr("stroke-width", ".5px");
    this.dots = d3
      .select(this.containerTarget)
      .select("svg")
      .append("g")
      .attr("class", "dots");
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
    const maximum = d3.max(bins);
    this.heat.max(maximum);
    this.redrawheat();
    //this.dots
    //  .selectAll("circle")
    //  .data(data)
    //  .enter()
    //  .append("circle")
    //  .attr("cx", (d) => this.projection([d.longitude, d.latitude])![0])
    //  .attr("cy", (d) => this.projection([d.longitude, d.latitude])![1])
    //  .attr("r", 2) // Radius of the dots
    //  .attr("opacity", 0.1)
    //  .attr("fill", "red"); // Color of the dots
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
    this.throttledRedrawHeat();
    // this.dots.selectAll("circle").attr("visibility", (d: any) => {
    //   const visible = this.wordFilter(d) && this.timeFilter(d);
    //   return visible ? "visible" : "hidden";
    // });
  }

  redrawheat() {
    this.heat.clear();

    const data = this.dataset
      .filter(this.wordFilter)
      .filter(this.timeFilter)
      .map(({ x, y }) => [x, y, 1]);
    this.heat.data(data);
    // this.heat.max(12000);
    this.heat.draw(0.05);
  }

  throttle(mainFunction: any, delay: number) {
    let timerFlag: NodeJS.Timeout | null = null;

    // Returning a throttled version
    return (...args: any) => {
      if (timerFlag === null) {
        // If there is no timer currently running
        mainFunction(...args); // Execute the main function
        timerFlag = setTimeout(() => {
          timerFlag = null;
        }, delay);
      }
    };
  }

  throttledRedrawHeat = this.throttle(
    this.redrawheat.bind(this),
    17 // 60fps
  );
}
