import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import {
  buildTimeFilter,
  FilterChangeEvent,
  LandFilter,
  TimeFilter,
  WordFilter,
} from "../filter";
import { AggregationKey, DatasetRow } from "./main_controller";

type FacetRow = DatasetRow & {
  day: string;
};

export default class extends Controller {
  static targets = ["fileInput", "container"];
  declare readonly fileInputTarget: HTMLInputElement;
  declare readonly containerTarget: HTMLDivElement;

  svg!: d3.Selection<SVGGElement, unknown, null, undefined>;

  xScale!: d3.ScaleTime<number, number, never>;
  yScale!: d3.ScaleLinear<number, number, never>;

  margin = { top: 8, right: 16, bottom: 16, left: 32 };
  width!: number;
  height!: number;
  extent!: [[number, number], [number, number]];

  facet: FacetRow[] = [];

  histogramData: { day: string; count: number }[] = [];

  connect(): void {
    this.width =
      this.containerTarget.clientWidth - this.margin.left - this.margin.right;
    this.height =
      this.containerTarget.clientHeight - this.margin.top - this.margin.bottom;
    this.extent = [
      [0, 0],
      [this.width, this.height],
    ];

    this.svg = d3
      .select(this.containerTarget)
      .append("svg")
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xScale = d3.scaleTime().range([0, this.width]);
    this.yScale = d3.scaleLinear().range([this.height, 0]);

    this.svg.append("g").attr("id", "bars");
    this.initBrush();
  }

  buildHistogram() {
    const dataFiltered = this.facet
      .filter((d) => this.wordFilter(d))
      .filter((d) => this.landFilter(d));

    const key = this.aggregationKey;
    let counter: (bin: FacetRow[]) => number;
    if (key === null) {
      counter = (bin) => bin.length;
    } else {
      counter = (bin) => new Set(bin.map((p) => p[key])).size;
    }

    const countByDay = d3.rollup(
      dataFiltered,
      (v) => counter(v),
      (d) => d.day,
    );

    return Array.from(countByDay, ([day, count]) => ({
      day,
      count,
    }));
  }

  redraw() {
    this.histogramData = this.buildHistogram();
    this.redrawXAxis();
    this.redrawYAxis();

    // TODO: there must be a better way...
    const bandwidth = this.xScale.range()[1] / 365;

    this.svg
      .select("#bars")
      .selectAll<SVGRectElement, { day: string; count: number }>("rect")
      .data(this.histogramData, (d) => d.day)
      .join(
        (enter) => {
          return enter
            .append("rect")
            .attr("width", bandwidth) // TODO: compute band width
            .attr("height", (d) => this.height - this.yScale(d.count))
            .attr("y", (d) => this.yScale(d.count))
            .attr("x", (d) => this.xScale(new Date(d.day)));
        },
        (update) => {
          return update
            .attr("height", (d) => this.height - this.yScale(d.count))
            .attr("y", (d) => this.yScale(d.count))
            .attr("x", (d) => this.xScale(new Date(d.day)));
        },
        (exit) => {
          return exit.remove();
        },
      );
  }

  redrawXAxis() {
    // FIXME: this never changes but is always redrawn
    const bounds = d3.extent(this.facet, ({ time }) => time);
    this.xScale.domain(bounds as [number, number]);

    this.svg.select("#xAxis").remove();
    this.svg
      .append("g")
      .attr("id", "xAxis")
      .attr("transform", `translate(0,${this.height})`)
      .call(d3.axisBottom(this.xScale));
  }

  redrawYAxis() {
    const bounds = [0, d3.max(this.histogramData, (d) => d.count)];
    this.yScale.domain(bounds as [number, number]);

    this.svg.select("#yAxis").remove();
    this.svg.insert("g", ":first-child").attr("id", "yAxis").call(d3.axisLeft(this.yScale).tickSize(-this.width)).selectAll('.tick line')
    .attr("stroke", "#ddd");
  }

  //=[ DATA INGESTION ]=========================================================

  updateDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    this.facet = dataset.map((row) => {
      const day = d3.timeFormat("%Y-%m-%d")(new Date(row.time));
      return { ...row, day };
    });
    this.redraw();
  }

  //=[ BRUSHING ]===============================================================

  initBrush() {
    const brush = d3
      .brushX()
      .extent(this.extent)
      .on("start brush end", this.handleBrushEvent.bind(this));

    this.svg.append("g").attr("id", "brush").call(brush).call(brush.move, null);
  }

  handleBrushEvent(event: d3.D3BrushEvent<unknown>) {
    const timespan: [Date, Date] | null = event.selection
      ? [
          this.xScale.invert(event.selection[0] as d3.NumberValue),
          this.xScale.invert(event.selection[1] as d3.NumberValue),
        ]
      : null;
    this.changeTimeFilter(timespan);
  }

  //=[ FILTERING ]==============================================================

  landFilter: LandFilter = () => true;
  timeFilter: TimeFilter = () => true;
  wordFilter: WordFilter = () => true;

  updateFilter({ detail: { landFilter, wordFilter } }: FilterChangeEvent) {
    if (landFilter) this.landFilter = landFilter;
    if (wordFilter) this.wordFilter = wordFilter;
    this.redraw();
  }

  changeTimeFilter(timespan: [Date, Date] | null) {
    this.timeFilter = buildTimeFilter(timespan);
    this.dispatch("filterChanged", {
      detail: { timeFilter: this.timeFilter },
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
