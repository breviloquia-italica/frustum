import { Controller } from "@hotwired/stimulus";
import { assert } from "console";

import { SimpleHeat } from "simpleheat-ts";

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
  static targets = ["container", "heatCanvas"];
  declare readonly containerTarget: HTMLDivElement;
  declare readonly heatCanvasTarget: HTMLCanvasElement;

  projection!: d3.GeoProjection;
  dots!: d3.Selection<SVGGElement, unknown, null, undefined>;
  heat!: any;
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
    this.heat = new SimpleHeat(
      document.createElement("canvas"),
      document.createElement("canvas")
    );
    this.heatCanvasTarget.style.width = "100%";
    this.heatCanvasTarget.style.height = "100%";
    // ...then set the internal size to match
    this.heatCanvasTarget.width = this.heatCanvasTarget.offsetWidth;
    this.heatCanvasTarget.height = this.heatCanvasTarget.offsetHeight;
    // this.heat.resize();
    this.heat.radius(3, 6);

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
    this.dots = d3
      .select(this.containerTarget)
      .select("svg")
      .append("g")
      .attr("class", "dots");

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
    const maximum = d3.max(bins);
    this.heat.max(maximum);
    this.redrawheat();

    //console.log(this.hexbin(this.dataset.map((d) => [d.x, d.y])));
    const color = d3
      .scaleLinear()
      .domain([0, 600]) // Number of points in the bin?
      .range(["transparent", "#69b3a2"]);

    this.svg.append("g").attr("id", "hexbins");
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
    this.redrawheat();
    // this.dots.selectAll("circle").attr("visibility", (d: any) => {
    //   const visible = this.wordFilter(d) && this.timeFilter(d);
    //   return visible ? "visible" : "hidden";
    // });
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
    //.domain([0, 0.33 * 100, 0.66 * 100, 1 * 100]) // Number of points in the bin?
    //.range(["transparent", "blue", "lime", "red"]);

    const densityData = d3
      .contourDensity()
      .x((d) => d[0])
      .y((d) => d[1])
      .size([
        this.containerTarget.clientWidth,
        this.containerTarget.clientHeight,
      ])
      .bandwidth(8)
      .thresholds(64)(
      this.dataset
        .filter(this.wordFilter)
        .filter(this.timeFilter)
        .map(({ x, y }) => [x, y])
    );

    // this.svg
    //   .select("#hexbins")
    //   //.insert("g", "g")
    //   .selectAll("path")
    //   .data(densityData)
    //   .join(
    //     (enter: any) => {
    //       return enter
    //         .append("path")
    //         .attr("d", d3.geoPath())
    //         .attr("fill", (d: any) => color(d.value));
    //     },
    //     (update: any) => {
    //       return update
    //         .attr("d", d3.geoPath())
    //         .attr("fill", (d: any) => color(d.value));
    //     },
    //     (exit: any) => {
    //       return exit.remove();
    //     }
    //   );

    //return;

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
    return;
    this.heat.clear();

    const data = this.dataset
      .filter(this.wordFilter)
      .filter(this.timeFilter)
      .map(({ x, y }) => [x, y, 1]);
    this.heat.data(data);
    // this.heat.max(12000);
    this.heat.draw(this.heatCanvasTarget.getContext("2d"), 0.05);
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
    8 //17 // 60fps
  );
}
