import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";
import { buildWordFilter } from "../utils";

export default class extends Controller {
  static targets = ["fileInput", "sliderContainer"];
  declare readonly fileInputTarget: HTMLInputElement;
  declare readonly sliderContainerTarget: HTMLDivElement;

  svg!: d3.Selection<SVGGElement, unknown, null, undefined>;

  xScale!: d3.ScaleTime<number, number, never>;
  yScale!: d3.ScaleLinear<number, number, never>;

  margin!: { top: number; right: number; bottom: number; left: number };
  width!: number;
  height!: number;

  facet: { word: string; day: string }[] = [];

  connect(): void {
    this.margin = { top: 8, right: 16, bottom: 16, left: 32 };
    this.width =
      this.sliderContainerTarget.clientWidth -
      this.margin.left -
      this.margin.right;
    this.height =
      this.sliderContainerTarget.clientHeight -
      this.margin.top -
      this.margin.bottom;

    // Append the svg object to the container
    this.svg = d3
      .select(this.sliderContainerTarget)
      .append("svg")
      .attr("width", "100%") // this.width + this.margin.left + this.margin.right)
      .attr("height", "100%") // this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.xScale = d3.scaleTime().range([0, this.width]);

    this.yScale = d3.scaleLinear().range([this.height, 0]);
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
    this.facet = data.map(({ word, day }) => ({ word, day }));

    const countByDay = d3.rollup(
      this.facet,
      (v) => v.length,
      (d) => d.day,
    );

    // Convert the Map to an array of objects for easier processing
    const histogramData = Array.from(countByDay, ([date, count]) => ({
      date,
      count,
    }));

    this.xScale.domain(d3.extent(data, (d) => d.timestamp) as [Date, Date]);

    // TODO: y changes when wordlist changes
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
      .attr("x", (d) => this.xScale(new Date(d.date)));

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("start brush end", this.handleBrush.bind(this));

    this.svg.append("g").attr("id", "brush").call(brush).call(brush.move, null); // this.xScale.range() as any);
  }

  handleBrush(event: d3.D3BrushEvent<unknown>) {
    const timespan: [Date, Date] | null = event.selection
      ? [
          this.xScale.invert(event.selection[0] as d3.NumberValue),
          this.xScale.invert(event.selection[1] as d3.NumberValue),
        ]
      : null;

    this.dispatch("timespanChanged", {
      detail: { timespan },
    });
  }

  updateWordlist({
    detail: { wordlist },
  }: CustomEvent<{
    wordlist: string[];
  }>) {
    const filter = buildWordFilter(wordlist);

    const countByDay = d3.rollup(
      this.facet.filter(({ word }) => filter({ word })),
      (v) => v.length,
      (d) => d.day,
    );

    // Convert the Map to an array of objects for easier processing
    const histogramData = Array.from(countByDay, ([date, count]) => ({
      date,
      count,
    }));

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
      .attr("x", (d) => this.xScale(new Date(d.date)));

    //this.dots.selectAll("circle").attr("visibility", (d: any) => {
    //  return wordFilter(d) ? "visible" : "hidden";
    //});
  }
}
