import { useEffect, useRef } from "react";
import * as d3 from "d3";
import "./graph.css"; // Import the CSS file

const data = {
  name: "Current Year",
  percentage: 100,
  year: 2024,
  children: [
    {
      name: "R&B",
      percentage: 50,
      year: 2024,
      children: [
        {
          name: "R&B",
          percentage: 45,
          year: 2023,
          children: [
            {
              name: "R&B",
              percentage: 35,
              year: 2022,
              children: [
                {
                  name: "R&B",
                  percentage: 50,
                  year: 2021,
                  children: [
                    {
                      name: "R&B",
                      percentage: 40,
                      year: 2020,
                      children: [{ name: "R&B", percentage: 30, year: 2019 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Treatment",
      percentage: 30,
      year: 2024,
      children: [
        {
          name: "Treatment",
          percentage: 35,
          year: 2023,
          children: [
            {
              name: "Treatment",
              percentage: 40,
              year: 2022,
              children: [
                {
                  name: "Treatment",
                  percentage: 32,
                  year: 2021,
                  children: [
                    {
                      name: "Treatment",
                      percentage: 25,
                      year: 2020,
                      children: [
                        { name: "Treatment", percentage: 20, year: 2019 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Investigations",
      percentage: 15,
      year: 2024,
      children: [
        {
          name: "Investigations",
          percentage: 20,
          year: 2023,
          children: [
            {
              name: "Investigations",
              percentage: 18,
              year: 2022,
              children: [
                {
                  name: "Investigations",
                  percentage: 22,
                  year: 2021,
                  children: [
                    {
                      name: "Investigations",
                      percentage: 15,
                      year: 2020,
                      children: [
                        { name: "Investigations", percentage: 10, year: 2019 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Surgical Fees",
      percentage: 5,
      year: 2024,
      children: [
        {
          name: "Surgical Fees",
          percentage: 10,
          year: 2023,
          children: [
            {
              name: "Surgical Fees",
              percentage: 8,
              year: 2022,
              children: [
                {
                  name: "Surgical Fees",
                  percentage: 12,
                  year: 2021,
                  children: [
                    {
                      name: "Surgical Fees",
                      percentage: 10,
                      year: 2020,
                      children: [
                        { name: "Surgical Fees", percentage: 5, year: 2019 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const TreeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 960;
    const height = 500;

    const tree = d3.tree().size([height, width - 160]);

    let root = d3.hierarchy(data, (d) => d.children);
    root.x0 = height / 2;
    root.y0 = 0;

    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.depth > 1) d.children = null;
    });

    const g = svg.append("g").attr("transform", "translate(80,0)");

    const update = (source: any) => {
      const nodes = root.descendants().reverse();
      const links = root.links();

      nodes.forEach((d) => {
        if (d.children) {
          d.children.sort((a, b) => b.data.percentage - a.data.percentage);
        }
      });

      tree(root);

      let node = g.selectAll("g.node").data(nodes, (d: any) => d.id);

      let nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d: any) => `translate(${source.y0},${source.x0})`)
        .on("click", (event, d: any) => {
          d.children = d.children ? null : d._children;
          update(d);
        });

      nodeEnter
        .append("g")
        .attr("class", "node-label")
        .attr("transform", "translate(0, -25)")
        .append("text")
        .attr("class", "label")
        .attr("dy", 3)
        .attr("x", 0)
        .text(
          (d: any) => `${d.data.name}, ${d.data.year}, ${d.data.percentage}%`
        )
        .attr("text-anchor", "middle");

      nodeEnter
        .append("g")
        .attr("class", "progress-bar-group")
        .append("rect")
        .attr("class", "progress-bar-background")
        .attr("x", -50)
        .attr("y", -10)
        .attr("width", 100)
        .attr("height", 20)
        .attr("fill", "#ddd");

      nodeEnter
        .select(".progress-bar-group")
        .append("rect")
        .attr("class", "progress-bar")
        .attr("x", -50)
        .attr("y", -10)
        .attr("width", (d: any) => d.data.percentage)
        .attr("height", 20)
        .attr("fill", (d: any) => color(d.data.name));

      let nodeUpdate = nodeEnter.merge(node);

      nodeUpdate
        .transition()
        .duration(200)
        .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

      nodeUpdate.select("rect.progress-bar").style("fill-opacity", 1);

      let nodeExit = node
        .exit()
        .transition()
        .duration(200)
        .attr("transform", (d: any) => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select("rect.progress-bar").style("fill-opacity", 0);

      let link = g.selectAll("path.link").data(links, (d: any) => d.target.id);

      let linkEnter = link
        .enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("d", (d: any) => {
          let o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        })
        .attr("marker-end", "url(#arrow)");

      let linkUpdate = linkEnter.merge(link);

      linkUpdate.transition().duration(200).attr("d", diagonal);

      link
        .exit()
        .transition()
        .duration(200)
        .attr("d", (d: any) => {
          let o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        })
        .remove();

      nodes.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    const diagonal = d3
      .linkHorizontal()
      .x((d: any) => d.y)
      .y((d: any) => d.x);

    const color = (name: string) => {
      if (name.startsWith("R&B")) {
        return "red";
      } else if (name.startsWith("Treatment")) {
        return "green";
      } else if (name.startsWith("Investigations")) {
        return "blue";
      } else if (name.startsWith("Surgical Fees")) {
        return "orange";
      } else {
        return "gray";
      }
    };

    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("class", "arrowHead");

    update(root);
  }, []);

  return <svg ref={svgRef} width={960} height={500}></svg>;
};

export default TreeGraph;
