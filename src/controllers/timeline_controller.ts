import { Controller } from "@hotwired/stimulus";
import * as d3 from "d3";

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

  connect(): void {
    this.margin = { top: 10, right: 30, bottom: 30, left: 40 };
    this.width =
      this.sliderContainerTarget.clientWidth -
      this.margin.left -
      this.margin.right;
    this.height = 100 - this.margin.top - this.margin.bottom;

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
    const countByDay = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.day
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
      number
    ]);

    this.svg
      .append("g")
      .attr("transform", `translate(0,${this.height})`)
      .call(d3.axisBottom(this.xScale));

    this.svg.append("g").call(d3.axisLeft(this.yScale));

    this.svg
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
        [this.margin.left, 0.5],
        [
          this.width - this.margin.right,
          this.height - this.margin.bottom + 0.5,
        ],
      ])
      .on("start brush end", this.handleBrush.bind(this));

    const defaultSelection = [this.xScale.range()[0], this.xScale.range()[1]];

    this.svg
      .append("g")
      .call(brush)
      .call(brush.move, defaultSelection as any);
  }

  handleBrush(event: d3.D3BrushEvent<any>) {
    const selectedPeriod: [Date, Date] = [
      this.xScale.invert(event.selection![0] as d3.NumberValue),
      this.xScale.invert(event.selection![1] as d3.NumberValue),
    ];

    this.dispatch("selectedPeriodChanged", {
      detail: { selectedPeriod },
    });
  }
}
