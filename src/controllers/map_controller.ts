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
import { DatasetRow } from "./main_controller";

type FacetRow = DatasetRow & {
  x: number;
  y: number;
};

export default class extends Controller {
  static targets = ["container"];
  declare readonly containerTarget: HTMLDivElement;

  projection!: d3.GeoProjection;
  hexbin!: Hexbin<[number, number]>;
  svg!: any;

  facet: FacetRow[] = [];

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

    this.svg.append("g").attr("id", "hexbins");
    this.hexbin = hexbin().radius(6).extent(extent);

    const brush = d3
      .brush()
      .extent(extent)
      .on("start brush end", this.handleBrush.bind(this));

    this.svg
      .append("g")
      .attr("id", "mapBrush")
      .call(brush)
      .call(brush.move, null);
  }

  handleBrush(event: d3.D3BrushEvent<unknown>) {
    const landarea: [[number, number], [number, number]] | null =
      event.selection
        ? [
            this.projection.invert!(event.selection[0] as [number, number])!,
            this.projection.invert!(event.selection[1] as [number, number])!,
          ]
        : null;

    this.dispatch("landareaChanged", {
      detail: { landarea },
    });
  }

  disconnect() {}

  reloadDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    this.facet = dataset.map((row) => {
      const [x, y] = this.projection([row.longitude, row.latitude])!;
      return { ...row, x, y };
    });
    this.redrawheat();
  }

  updateFilter({
    detail: { timespan, wordlist },
  }: CustomEvent<{
    timespan: [Date, Date] | null;
    wordlist: string[] | null;
  }>) {
    this.wordFilter = buildWordFilter(wordlist);
    this.timeFilter = buildTimeFilter(timespan);
    this.redrawheat();
  }

  redrawheat() {
    const dee = this.facet
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
          // FIXME: this doesn't quite work, as hexbins are not generated in a linear fashion
          return exit.attr("fill", function (d: any) {
            return "#BBB";
          });
        },
      );
  }
}
