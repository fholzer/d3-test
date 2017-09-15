import React, { Component } from 'react';
import * as d3 from 'd3/build/d3.node.js';
import './Chart.css';

class TimeSeries {
    constructor(data, accessors, options) {
        this.data = data;
        this.accessors = accessors;
        this.options = options;
        this.domain = {
            x: d3.extent(data, accessors.x),
            y: d3.extent(data, accessors.y)
        };
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

    }

    componentDidMount() {
        var margin = {top: 50, right: 20, bottom: 60, left: 90},
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        var x = this.scaleX = d3.scaleTime()
            .range([0, width]);

        var y = this.scaleY = d3.scaleLinear()
            .range([height, 0]);

        var xAxis = d3.axisBottom(x)
            .tickArguments([d3.timeHour.every(24)])
            //makes the xAxis ticks a little longer than the xMinorAxis ticks
            .tickSize(10);

        var xMinorAxis = d3.axisBottom(x)
        	.tickArguments([d3.timeHour.every(12)]);

        var yAxis = d3.axisLeft(y);

        var accessorX = this.accessorX = (d) => d.date,
            accessorY = this.accessorY = (d) => d.value

        var line = d3.line()
            .x((d) => x(accessorX(d)))
            .y((d) => y(accessorY(d)));
            //.x((d) => x(this.props.accessorX(d)))
            //.y((d) => y(this.props.accessorY(d)));

        //The format in the CSV, which d3 will read
        var parseDate = d3.timeFormat("%Y-%m-%d %X");

        //format for tooltip
        //https://github.com/mbostock/d3/wiki/Time-Formatting
        //var formatTime = d3.time.format("%e %b");
        var formatTime = this.formatTime = d3.timeFormat("%Y-%m-%dT%H:%M:%S%Z");
        var formatCount = this.formatCount = d3.format(",");


        // create required DOM elements
        var div = this.div = d3.select(this.divNode)
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select(this.svgNode)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var domain = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var mouseCatcher = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg = domain;

        // function for the y grid lines
        function make_y_axis() {
          return d3.axisLeft(y)
              //.ticks(10);
        }


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
    		.attr('class','d3_timeseries mouse-catch')
    		.attr('height',height)
    		.style('opacity',0)
    		.on('mousemove', (unk1, unk2, els) => this.graphMouseMove(els))
    		.on('mouseout', this.graphMouseOut);

        //reading in CSV which contains data
        fetch(process.env.PUBLIC_URL + "/data/atvp1xabts513.json")
        .then(function(res) {
            return res.json();
        })
        .then((res) => {
            var data = this.data = res[0].metricValues;

            data.forEach((d) => d.date = new Date(d.startTimeInMillis));

            //using imported data to define extent of x and y domains
            x.domain(d3.extent(data, function(d) { return d.date; }));
            y.domain([0, d3.max(data, function(d) { return d.value; }) * 1.05]);
            //y.domain(d3.extent(data, function(d) { return d.value; }));

            // Draw the y Grid lines
            svg.append("g")
                .attr("class", "grid")
                .call(make_y_axis()
                        .tickSize(-width, 0, 0)
                        .tickFormat("")
                )

            svg.append("path")
                .datum(data)
                .attr("class", "line")
                .attr("d", line);

            //taken from http://bl.ocks.org/mbostock/3887118
            //and http://www.d3noob.org/2013/01/change-line-chart-into-scatter-plot.html
            //creating a group(g) and will append a circle and 2 lines inside each group
            var g = this.rings = svg.selectAll()
                .data(data).enter().append("g");

            //The markers on the line
            g.append("circle")
                .attr("class", "dot")
                .attr("r", 2)
                .attr("cx", function(d) { return x(accessorX(d)); })
                .attr("cy", function(d) { return y(accessorY(d)); });

            var minX = d3.min(data, accessorX);

            //The horizontal dashed line that appears when a circle marker is moused over
            g.append("line")
                .attr("class", "dashedLine x")
                .attr("x1", function(d) { return x(accessorX(d)); })
                .attr("y1", function(d) { return y(accessorY(d)); })
                //d3.min gets the min date from the date x-axis scale
                .attr("x2", function(d) { return x(minX); })
                .attr("y2", function(d) { return y(accessorY(d)); });

            //The vertical dashed line that appears when a circle marker is moused over
            g.append("line")
                .attr("class", "dashedLine y")
                .attr("x1", function(d) { return x(accessorX(d)); })
                .attr("y1", function(d) { return y(accessorY(d)); })
                .attr("x2", function(d) { return x(accessorX(d)); })
                .attr("y2", height);

            //circles are selected again to add the mouseover functions
            g.selectAll("circle")
            .on("mouseover", function(d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html("value: " + formatCount(accessorY(d)) + "<br/>" + formatTime(accessorX(d)))
                    .style("left", (d3.event.pageX - 20) + "px")
                    .style("top", (d3.event.pageY + 6) + "px");
                //selects the horizontal dashed line in the group
                d3.select(this.nextElementSibling).transition()
                    .duration(200)
                    .style("opacity", .9);
                //selects the vertical dashed line in the group
                d3.select(this.nextElementSibling.nextElementSibling).transition()
                    .duration(200)
                    .style("opacity", .9);
            })

            .on("mouseout", function(d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);

                d3.select(this.nextElementSibling).transition()
                    .duration(500)
                    .style("opacity", 0);

                d3.select(this.nextElementSibling.nextElementSibling).transition()
                    .duration(500)
                    .style("opacity", 0);
            });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .selectAll(".tick text")
                .call(wrap, 35);

            svg.append("g")
                .attr("class","xMinorAxis")
                //.style({ 'stroke': 'Black', 'fill': 'none', 'stroke-width': '1px'})
                .style('stroke', 'Black')
                .style('fill', 'none')
                .style('stroke-width', '1px')
                .attr("transform", "translate(0," + height + ")")
                .call(xMinorAxis)
                .selectAll("text").remove();

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                //text label for the y-axis inside chart
/*
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .style("font-size", "16px")
                .style("background-color","red")
                .text("road length (km)");
*/


            //http://bl.ocks.org/mbostock/7555321
            //This code wraps label text if it has too much text
            function wrap(text, width) {
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

        });

    }

    graphMouseMove(elements) {
        console.log("this", this);
        //console.log("arguments", arguments);
        var x = d3.mouse(elements[0])[0];
        x = this.scaleX.invert(x);
        console.log("x", x);
        console.log(this.rings.selectAll(".dots"))

        /*
        mousevline.datum({x:x,visible:true});
        mousevline.update();

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

    graphMouseMove(e) {
		var x = d3.mouse(container[0][0])[0];
		x = xscale.invert(x);
		mousevline.datum({x:x,visible:true});
		mousevline.update();
		updatefocusRing(x);
		updateTip(x);
	}

	graphMouseOut(e) {
		mousevline.datum({ x: null, visible: false });
		mousevline.update();
		updatefocusRing(null);
		updateTip(null);
	}
    */


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
