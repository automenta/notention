// src/components/GraphView/GraphView.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSystemNote, onSystemNoteChange } from '../../lib/systemNote';
import styles from './GraphView.module.css';
import * as d3 from 'd3';  // Import D3.js

interface Node {
    id: string;
    title: string;
    x: number;
    y: number;
}

interface Edge {
    source: string;
    target: string;
}

const generateRandomPosition = (width: number, height: number) => ({
    x: Math.random() * width,
    y: Math.random() * height,
});

export const GraphView: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [graphContainerSize, setGraphContainerSize] = useState({ width: 0, height: 0 });
    const system = getSystemNote();
    const graphViewRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);  // Ref for the SVG element

    // Move the setGraphContainerSize update outside of the useEffect
    useEffect(() => {
        const handleResize = () => {
            if (graphViewRef.current) {
                setGraphContainerSize({
                    width: graphViewRef.current.clientWidth,
                    height: graphViewRef.current.clientHeight,
                });
            }
        };

        handleResize(); // Initial size calculation
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const updateGraph = useCallback(() => {
        const notes = system.getAllNotes();

        const newNodes = notes.map(note => {
            return {
                id: note.id,
                title: note.title,
                ...generateRandomPosition(graphContainerSize.width, graphContainerSize.height),
            };
        });

        const newEdges = notes.flatMap(sourceNote =>
            sourceNote.references.map(targetId => ({
                source: sourceNote.id,
                target: targetId,
            }))
        );

        setNodes(newNodes);
        setEdges(newEdges);
    }, [system, graphContainerSize]);

    useEffect(() => {
        const throttledUpdateGraph = () => {
            setTimeout(() => {
                updateGraph();
            }, 500); // Adjust the delay (in milliseconds) as needed
        };

        throttledUpdateGraph();
        const unsubscribe = onSystemNoteChange(throttledUpdateGraph);

        return () => {
            unsubscribe();
        };
    }, [updateGraph]);

    // D3.js graph rendering
    useEffect(() => {
        if (!nodes.length || !edges.length || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();  // Clear previous graph

        // Create force simulation
        const simulation = d3.forceSimulation(nodes as any)
            .force("link", d3.forceLink(edges).id((d: any) => d.id))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(graphContainerSize.width / 2, graphContainerSize.height / 2));

        // Create links
        const links = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(edges)
            .enter()
            .append("line")
            .attr("class", styles.edge);

        // Create nodes
        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 15)
            .attr("class", styles.node)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended) as any);

        node.append("title")
            .text((d: any) => d.title);

        // Add labels to nodes
        const labels = svg.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("class", styles.nodeLabel)
            .attr("text-anchor", "middle")
            .attr("y", 5)
            .text((d: any) => d.title);

        simulation.on("tick", () => {
            links
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node
                .attr("cx", (d: any) => d.x)
                .attr("cy", (d: any) => d.y);

            labels
                .attr("x", (d: any) => d.x)
                .attr("y", (d: any) => d.y + 5);
        });

        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

    }, [nodes, edges, graphContainerSize]);

    return (
        <div className={styles.graphView} ref={graphViewRef}>
            <h2>Note Graph Visualization 🕸️</h2>
            <svg width="100%" height="600px" ref={svgRef}></svg>
        </div>
    );
};
