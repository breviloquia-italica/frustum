import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import {
  buildTimeFilter,
  FilterChangeEvent,
  LandFilter,
  TimeFilter,
  WordFilter,
} from "../filter";
import { DatasetRow } from "./main_controller";

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
  }

  firstRedraw() {
    const histogramData = this.buildHistogram();

    this.xScale.domain(
      d3.extent(this.facet, ({ time }) => time) as [number, number],
    );

    this.yScale.domain([0, d3.max(histogramData, (d) => d.count)] as [
      number,
      number,
    ]);

    this.svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .call(d3.axisBottom(this.xScale));

    this.svg.append("g").attr("id", "yAxis").call(d3.axisLeft(this.yScale));

    this.svg
      .append("g")
      .attr("id", "bars")
      .selectAll("rect")
      .data(histogramData)
      .join("rect")
      .attr("width", 2) // bandwidth?
      .attr("height", (d) => this.height - this.yScale(d.count))
      .attr("y", (d) => this.yScale(d.count))
      .attr("x", (d) => this.xScale(new Date(d.day)));

    this.initBrush();
  }

  buildHistogram() {
    const countByDay = d3.rollup(
      this.facet
        .filter((d) => this.wordFilter(d))
        .filter((d) => this.landFilter(d)),
      (v) => v.length,
      (d) => d.day,
    );

    return Array.from(countByDay, ([day, count]) => ({
      day,
      count,
    }));
  }

  redraw() {
    const histogramData = this.buildHistogram();

    this.yScale.domain([0, d3.max(histogramData, (d) => d.count)] as [
      number,
      number,
    ]);

    this.svg.select("#yAxis").remove();
    this.svg.append("g").attr("id", "yAxis").call(d3.axisLeft(this.yScale));

    this.svg
      .select("#bars")
      .selectAll("rect")
      .data(histogramData)
      .join("rect")
      .attr("width", 2) // bandwidth?
      .attr("height", (d) => this.height - this.yScale(d.count))
      .attr("y", (d) => this.yScale(d.count))
      .attr("x", (d) => this.xScale(new Date(d.day)));
  }

  //=[ DATA INGESTION ]=========================================================

  updateDataset({
    detail: { dataset },
  }: CustomEvent<{ dataset: DatasetRow[] }>) {
    this.facet = dataset.map((row) => {
      const day = d3.timeFormat("%Y-%m-%d")(new Date(row.time));
      return { ...row, day };
    });
    this.firstRedraw();
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
}
