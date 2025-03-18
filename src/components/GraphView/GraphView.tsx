// src/components/GraphView/GraphView.tsx
import React, {useEffect, useState} from 'react';
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

    useEffect(() => {
        const updateGraph = () => {
            const notes = system.getAllNotes();

            // Get container dimensions
            if (graphViewRef.current) {
                setGraphContainerSize({
                    width: graphViewRef.current.clientWidth,
                    height: graphViewRef.current.clientHeight,
                });
            }

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
        };

        updateGraph();

        const unsubscribe = onSystemNoteChange(updateGraph);

        // Update graph on window resize
        const handleResize = () => {
            updateGraph();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            unsubscribe();
            window.removeEventListener('resize', handleResize);
        };
    }, [system, graphContainerSize]);

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
                    <div
                        key={node.id}
                        className={styles.node}
                        style={{
                            left: node.x - 15, // Center the node
                            top: node.y - 15, // Center the node
                        }}
                    >
                        {node.title}
                    </div>
                ))}
            </svg>
        </div>
    );
};
