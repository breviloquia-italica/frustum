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
import { Hexbin, HexbinBin, hexbin } from "d3-hexbin";
import {
  buildLandFilter,
  FilterChangeEvent,
  LandFilter,
  TimeFilter,
  WordFilter,
} from "../filter";
import { AggregationKey, DatasetRow } from "./main_controller";
import { ramp } from "../utils";

type FacetRow = DatasetRow & {
  x: number;
  y: number;
};

type AggDatum = { [key in Exclude<AggregationKey, null>]: unknown };

export default class extends Controller {
  static targets = ["container"];
  declare readonly containerTarget: HTMLDivElement;

  projection!: d3.GeoProjection;
  hexbin!: Hexbin<[number, number]>;
  svg!: d3.Selection<SVGGElement, unknown, null, undefined>;
  extent!: [[number, number], [number, number]];

  facet: FacetRow[] = [];

  cScale!: d3.ScaleLinear<number, number, never>;

  async connect() {
    this.extent = [
      [64, 0],
      [
        this.containerTarget.clientWidth - 64,
        this.containerTarget.clientHeight,
      ],
    ];

    const bb = (await d3.json<d3.ExtendedFeatureCollection>(MAP_URL.regions))!;
    this.projection = d3.geoEqualEarth();
    this.projection.fitExtent(this.extent, bb);
    const geoGenerator = d3.geoPath().projection(this.projection);
    this.svg = d3.select(this.containerTarget).append("svg");
    this.svg.append("g").attr("id", "hexbins");
    this.svg
      .append("g")
      .attr("id", "italy")
      .selectAll("path")
      .data(bb.features)
      .enter()
      .append("path")
      .attr("d", geoGenerator);

    this.hexbin = hexbin().radius(6).extent(this.extent);

    this.initBrush();
    this.initLegend();
  }

  disconnect() {}

  redraw() {
    const dataFiltered = this.facet
      .filter(this.wordFilter)
      .filter(this.timeFilter);

    const dataBinned = this.hexbin(
      dataFiltered.map(({ x, y, tweet_id, user_id }) => {
        const datum = [x, y] as [number, number] & AggDatum;
        datum.user_id = user_id;
        datum.tweet_id = tweet_id;
        return datum;
      }),
    ) as (HexbinBin<[number, number] & AggDatum> & { count: number })[];

    const key = this.aggregationKey;
    let counter: (bin: HexbinBin<[number, number] & AggDatum>) => number;
    if (key === null) {
      counter = (bin) => bin.length;
    } else {
      counter = (bin) => new Set(bin.map((p) => p[key])).size;
    }

    dataBinned.forEach((bin) => (bin.count = counter(bin)));

    const mx = Math.max(...dataBinned.map((h) => h.count), 0);
    const color = (t: number) => d3.interpolateCool(t / mx); // TODO: maybe Cividis?

    this.cScale.domain([mx, 0] as [number, number]);
    this.drawCAxis();

    this.svg
      .select("#hexbins")
      .selectAll<SVGPathElement, Hexbin<[number, number]>[]>("path")
      .data(dataBinned) // TODO: unique indexing of bins so we can gray out empty ones
      .join(
        (enter) => {
          return enter
            .append("path")
            .attr("d", this.hexbin.hexagon())
            .attr("transform", ({ x, y }) => `translate(${x},${y})`)
            .attr("fill", (d) => color(d.count));
        },
        (update) => {
          return update
            .attr("transform", ({ x, y }) => `translate(${x},${y})`)
            .attr("fill", (d) => color(d.count));
        },
        (exit) => {
          return exit.remove();
        },
      );
  }

  initLegend() {
    this.cScale = d3
      .scaleLinear()
      .range([10, this.containerTarget.clientHeight - 10]);

    this.drawCColorBar();
    this.drawCAxis();
  }

  drawCAxis() {
    this.svg.select("#cAxis").remove();
    this.svg
      .append("g")
      .attr("id", "cAxis")
      .attr("transform", `translate(30,0)`)
      .call(d3.axisRight(this.cScale));
  }

  drawCColorBar() {
    this.svg
      .append("image")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", 20)
      .attr("height", this.containerTarget.clientHeight - 20)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(d3.interpolateViridis).toDataURL());
  }

  //=[ DATA INGESTION ]=========================================================

  updateDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    this.facet = dataset.map((row) => {
      const [x, y] = this.projection([row.longitude, row.latitude])!;
      return { ...row, x, y };
    });
    this.redraw();
  }

  //=[ BRUSHING ]===============================================================

  initBrush() {
    const brush = d3
      .brush()
      .extent(this.extent)
      .on("start brush end", this.handleBrushEvent.bind(this));

    this.svg
      .append("g")
      .attr("id", "mapBrush")
      .call(brush)
      .call(brush.move, null);
  }

  handleBrushEvent(event: d3.D3BrushEvent<unknown>) {
    const landarea: [[number, number], [number, number]] | null =
      event.selection
        ? [
            this.projection.invert!(event.selection[0] as [number, number])!,
            this.projection.invert!(event.selection[1] as [number, number])!,
          ]
        : null;
    this.changeLandFilter(landarea);
  }

  //=[ FILTERING ]==============================================================

  landFilter: LandFilter = () => true;
  timeFilter: TimeFilter = () => true;
  wordFilter: WordFilter = () => true;

  updateFilter({ detail: { timeFilter, wordFilter } }: FilterChangeEvent) {
    if (timeFilter) this.timeFilter = timeFilter;
    if (wordFilter) this.wordFilter = wordFilter;
    this.redraw();
  }

  changeLandFilter(landarea: [[number, number], [number, number]] | null) {
    this.landFilter = buildLandFilter(landarea);
    this.dispatch("filterChanged", {
      detail: { landFilter: this.landFilter },
    });
  }

  //=[ AGGREGATION ]============================================================

  aggregationKey: AggregationKey = null;

  updateCounter({
    detail: { aggregationKey },
  }: CustomEvent<{
    aggregationKey: AggregationKey;
  }>) {
    this.aggregationKey = aggregationKey;
    this.redraw();
  }
}
