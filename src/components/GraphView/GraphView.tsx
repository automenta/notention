// src/components/GraphView/GraphView.tsx
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {getSystemNote, onSystemNoteChange} from '../../lib/systemNote';
import styles from './GraphView.module.css';

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
    const [graphContainerSize, setGraphContainerSize] = useState({width: 0, height: 0});
    const system = getSystemNote();
    const graphViewRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className={styles.graphView} ref={graphViewRef}>
            <h2>Note Graph Visualization 🕸️</h2>
            <svg width="100%" height="600px">
                {edges.map((edge, index) => {
                    const sourceNode = nodes.find(node => node.id === edge.source);
                    const targetNode = nodes.find(node => node.id === edge.target);

                    if (!sourceNode || !targetNode) {
                        return null;
                    }

                    return (
                        <line
                            key={`edge-${index}`}
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            className={styles.edge}
                        />
                    );
                })}
                {nodes.map(node => (
                    <circle
                        key={node.id}
                        cx={node.x}
                        cy={node.y}
                        r="15"
                        className={styles.node}
                    >
                        <title>{node.title}</title>
                        <text
                            x={node.x}
                            y={node.y + 5} // Adjust vertical alignment as needed
                            textAnchor="middle"
                            className={styles.nodeLabel}
                        >
                            {node.title}
                        </text>
                    </circle>
                ))}
            </svg>
        </div>
    );
};
