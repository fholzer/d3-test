import React, { Component } from 'react';
import * as d3 from 'd3/build/d3.node.js';
import './Chart.css';

// https://jsfiddle.net/37oLLg1o/2/
const palettes = [
	[
    "#B2DFDB",
    "#00C8D5",
    "#03A9F4",
    "#1D69E7",
    "#402D9F",
    "#673AB7",
    "#9C27B0",
    "#E91E63"
	], [
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
    "#FF5722",
    "#F44336"
  ]
];

var makeColorScale = function(colorPalette, elementCount) {
    var tmp = d3.scaleLinear()
        .range([0, elementCount - 1])
        .domain([0, colorPalette.length - 1]);
    return d3.scaleLinear()
        .domain(d3.range(colorPalette.length).map(tmp))
        .range(colorPalette)
        .interpolate(d3.interpolateRgb);
};

class TimeSeries {
    constructor(name, data, accessors, options) {
        this.data = data;
        this.accessors = accessors;
        this.options = options;
        this.domain = {
            x: d3.extent(data, accessors.x),
            y: d3.extent(data, accessors.y)
        };
        this.sanityChecks();
    }

    sanityChecks() {
        if(this.data.filter((d) => !Number.isInteger(this.accessors.y(d))).length > 0) {
            throw new TypeError("Found invalid value");
        }
    }

    find(datum) {
        var ax = this.accessors.x;
		var bisect = d3.bisector(ax).left;
		var i = bisect(this.data, datum) - 1
		if(i === -1)
			return null

		//look to far after serie is defined
		if(i === this.data.length - 1 &&
            this.data.length > 1 &&
            Number(datum) - Number(ax(this.data[i])) > Number(ax(this.data[i])) - Number(ax(this.data[i - 1])))
            return null
		return this.data[i]
	}
}

export default class Chart extends Component {
    constructor() {
        super();
        this.s = [];
    }

    addSeries(series) {
        if(!series instanceof TimeSeries) {
            throw new TypeError("Can add only TimerSeries!");
        }
        if(!series.options) {
            series.options = {};
        }

        // add to series array
        this.s.push(series);

        // update color scale
        var colorScale = makeColorScale(palettes[0], this.s.length);

        // set colors
        this.s.forEach((s, i) => s.options.color = colorScale(i));

        // bind series to DOM
        var c = this.planes.chart.selectAll(".series")
            .data(this.s, (s) => s.name);

        // redraw axes
        this.drawAxes();

        // create containers for new series
        c.enter().append("g")
            .attr("class", "series")
            .nodes().forEach((c) => this.drawSeries(d3.select(c)));

        // remove absent series
        c.exit().remove();

        // update colors of existing series
        c.nodes().forEach((c) => this.updateColor(d3.select(c)));
    }

    redraw() {
        this.drawAxes();

        var c = this.planes.chart.selectAll(".series")
            .data(this.s, (s) => s.name);

        c.enter().append("g")
            .attr("class", "series")
            //.nodes().forEach((c) => this.drawSeries(c));

        c.exit().remove();

        c.nodes().forEach((c) => this.drawSeries(c));

        //this.s.forEach((s, i) => this.drawSeries(s, i));
    }

    updateColor(container) {
        var s = container.datum();
        console.log("new color: " + s.options.color);

        container.selectAll("path")
            .attr("stroke", s.options.color);

        console.log(container.selectAll("circle")
            .attr("stroke", s.options.color));
    }

    drawAxes() {
        var svg = this.svg,
            width = this.width,
            height = this.height,
            xAxis = this.axisX,
            yAxis = this.axisY,
            xMinorAxis = this.axisXMinor,
            x = this.scaleX,
            y = this.scaleY;

        //using imported data to define extent of x and y domains
        x.domain([d3.min(this.s, (s) => s.domain.x[0]), d3.max(this.s, (s) => s.domain.x[1])]);
        y.domain([0, d3.max(this.s, (s) => s.domain.y[1]) * 1.05]);
        //y.domain(d3.extent(data, function(d) { return d.value; }));

        // Draw the y Grid lines
        svg.select(".grid")
            .call(d3.axisLeft(y)
                    .tickSize(-width, 0, 0)
                    .tickFormat("")
            );

        svg.select(".x.axis.major")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll(".tick text")
            .call(this.wrap, 35);

        svg.select(".x.axis.minor")
            .attr("transform", "translate(0," + height + ")")
            .call(xMinorAxis)
            .selectAll("text").remove();

        svg.select(".y.axis")
            .call(yAxis);
    }

    drawSeries(container) {
        var s = container.datum(),
            data = s.data;

        var svg = container,
            height = this.height,
            accessorX = s.accessors.x,
            accessorY = s.accessors.y,
            x = this.scaleX,
            y = this.scaleY;

        var line = d3.line()
            .x((d) => x(accessorX(d)))
            .y((d) => y(accessorY(d)));

        svg.append("path")
            .datum(s.data)
            .attr("class", "line")
            .attr("stroke", s.options.color)
            .attr("d", line);

        var g = this.rings = svg.selectAll()
            .data(data).enter().append("g");

        //The markers on the line
        g.append("circle")
            .attr("class", "dot")
            .attr("stroke", s.options.color)
            .attr("r", 2)
            .attr("cx", (d) => x(accessorX(d)))
            .attr("cy", (d) => y(accessorY(d)));
    }

    componentDidMount() {
        var margin = {top: 50, right: 20, bottom: 60, left: 90},
            width = this.width = this.props.width - margin.left - margin.right,
            height = this.height = this.props.height - margin.top - margin.bottom;

        // create scales
        var x = this.scaleX = d3.scaleTime()
            .range([0, width]);

        var y = this.scaleY = d3.scaleLinear()
            .range([height, 0]);

        // create axes
        this.axisX = d3.axisBottom(x)
            //.tickArguments([d3.timeHour.every(24)])
            .ticks(8)
            .tickSize(10);

        this.axisXMinor = d3.axisBottom(x)
            //.tickArguments([d3.timeHour.every(12)]);
            .ticks(16)

        this.axisY = d3.axisLeft(y);


        //format for tooltip
        //https://github.com/mbostock/d3/wiki/Time-Formatting
        //var formatTime = d3.time.format("%e %b");
        this.formatTime = d3.timeFormat("%Y-%m-%dT%H:%M:%S%Z");
        this.formatCount = d3.format(",");

        this.planes = {};

        // create required DOM elements
        var rangeTranslate = "translate(" + margin.left + "," + margin.top + ")";
        this.div = d3.select(this.divNode)
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = this.planes.root = d3.select(this.svgNode)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var range = this.planes.chart = svg.append("g")
            .attr("transform", rangeTranslate);

        this.planes.annotations = svg.append("g")
            .attr("transform", rangeTranslate);

        this.planes.focusRings = this.planes.annotations.append("g");

        var mouseCatcher = this.planes.mouseCatcher = svg.append("g")
            .attr("transform", rangeTranslate);

        svg = this.svg = range;

        // create grid and axes container
        var axes = svg.append("g")
            .attr("class", "axes");

        ["grid", "x axis major", "x axis minor", "y axis major"].forEach((c) => axes.append("g").attr("class", c));

        this.mouseLine = axes.append("g")
            .attr("class", "mouseline")
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", height)
            .attr("y2", 0)

        //http://www.d3noob.org/2012/12/adding-axis-labels-to-d3js-graph.html
        svg.append("text")      // text label for the x-axis
            .attr("x", width / 2 )
            .attr("y",  height + margin.bottom)
            .style("text-anchor", "middle")
            .text("Date");

        svg.append("text")      // text label for the y-axis
            .attr("y",30 - margin.left)
            .attr("x",50 - (height / 2))
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "end")
            .style("font-size", "16px")
            .text("Calls per Minute");

        //http://www.d3noob.org/2013/01/adding-title-to-your-d3js-graph.html
        svg.append("text")      // text label for chart Title
            .attr("x", width / 2 )
            .attr("y", 0 - (margin.top/2))
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text("Calls per Minute on bets LS2");

        this.mouseCatcher = mouseCatcher.append('rect')
            .attr('width',width)
            .attr('class','mouse-catch')
            .attr('height',height)
            .style('opacity',0)
            .on('mousemove', (unk1, unk2, els) => this.graphMouseMove(els))
            .on('mouseout', (unk1, unk2, els) => this.graphMouseOut(els));


        var onDataLoadComplete = (name, res) => {
            var data = res[0].metricValues;
            data.forEach((d) => d.date = new Date(d.startTimeInMillis));

            this.addSeries(new TimeSeries(
                name,
                data,
                {
                    x: (d) => d.date,
                    y: (d) => d.value
                }
            ));
        }
        //reading in CSV which contains data
        var triggerLoad = (number) => {
            var name = "atvp1xabts" + number;
            fetch(process.env.PUBLIC_URL + "/data/" + name + ".json")
            .then((res) => res.json())
            .then((res) => onDataLoadComplete(name, res));
        }

        for(var i = 512; i < 520; i++) {
            triggerLoad(i);
        }
    }

    //http://bl.ocks.org/mbostock/7555321
    //This code wraps label text if it has too much text
    wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    graphMouseMove(elements) {
        var xpos = d3.mouse(elements[0])[0];
        var xdate = this.scaleX.invert(xpos);
        //console.log(this.rings.selectAll(".dots"))
        this.updateMouseLine(xpos);
        //this.updateTip(xdate);
		this.updatefocusRing(xdate);

        /*

        this.div.transition()
            .duration(200)
            .style("opacity", .9);
        this.div.html("value: " + this.formatCount(this.accessorY(d)) + "<br/>" + this.formatTime(this.accessorX(d)))
            .style("left", (d3.event.pageX - 20) + "px")
            .style("top", (d3.event.pageY + 6) + "px");
        //selects the horizontal dashed line in the group
        d3.select(el.nextElementSibling).transition()
            .duration(200)
            .style("opacity", .9);
        //selects the vertical dashed line in the group
        d3.select(el.nextElementSibling.nextElementSibling).transition()
            .duration(200)
            .style("opacity", .9);
            */
    }

    updatefocusRing(xdate) {
        var s = this.planes.focusRings.selectAll(".focusring");

        if(xdate === null) {
            s = s.data([]);
        } else {
            s = s.data(this.s.map(function(s,i) {
                return {
                    x: xdate,
                    item: s.find(xdate),
                    accessors: s.accessors
                };
            }).filter(function(d) {
                return d.item !== undefined && d.item !== null &&
                    d.accessors.y(d.item) !== null && !isNaN(d.accessors.y(d.item));
            }));
        }

        s.enter().append("circle")
            .attr('class','focusring')
            .attr('r',5)

        s.attr('cx',(d) => this.scaleX(d.accessors.x(d.item)))
            .attr('cy',(d) => this.scaleY(d.accessors.y(d.item)))

        s.exit().remove();

    }

    updateTip(x) {
        if(x === null) {
            this.div.transition()
                .duration(500)
                .style("opacity", 0);
            return;
        }

        var d = [];
        for(var s of this.s) {
            var nearest = s.find(x);
            d.push({
                name: s.options && s.options.displayname || s.name,
            });
        }

    }

    /*
    circleMouseOut(d) {
        div.transition()
            .duration(500)
            .style("opacity", 0);

        d3.select(this.nextElementSibling).transition()
            .duration(500)
            .style("opacity", 0);

        d3.select(this.nextElementSibling.nextElementSibling).transition()
            .duration(500)
            .style("opacity", 0);
    }
*/

    updateMouseLine(x) {
        if(x === null) {
            this.mouseLine.style("opacity", 0);
            return;
        }
        this.mouseLine
            .attr("x1", x)
            .attr("x2", x)
            .style("opacity", 1);
    }

	graphMouseOut(e) {
		this.updateMouseLine(null);
        this.updatefocusRing(null);
		/*
		updateTip(null);
        */
	}

    componentWillUnmount() {
        d3.select(this.svgNode).selectAll().remove();
        d3.select(this.divNode).selectAll().remove();
    }

    render() {
        return (
            <div>
                <svg
                    ref={(node) => this.svgNode = node}
                    width={this.props.width}
                    height={this.props.height}
                    />
                <div
                    ref={(node) => this.divNode = node}
                    />
            </div>
        );
    }
}
