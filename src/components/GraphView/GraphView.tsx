// src/components/GraphView/GraphView.tsx
import React, {useEffect, useRef} from 'react';
import cytoscape from 'cytoscape';
import {getSystemNote, onSystemNoteChange} from '../../lib/systemNote';
import styles from './GraphView.module.css';

export const GraphView: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<cytoscape.Core | null>(null);
    const system = getSystemNote();
    const isGraphInitialized = useRef(false); // Track initialization state

    useEffect(() => {
        if (!cyRef.current || isGraphInitialized.current) return; // Prevent re-initialization

        isGraphInitialized.current = true; // Mark as initialized
        cyInstance.current = cytoscape({
            container: cyRef.current,
            elements: [],
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(title)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'cose'
            }
        });

        const cy = cyInstance.current;
        const updateGraph = () => {
            if (!cy || cy.destroyed()) { // Check if cy is valid and not destroyed
                systemLog.warn("Cytoscape instance is not valid, skipping graph update.", "GraphView");
                return;
            }
            try {
                const notes = system.getAllNotes();
                cy.elements().remove();

                const nodes = notes.map(note => ({
                    data: {id: note.id, title: note.title, type: note.type, status: note.status}
                }));
                cy.add(nodes);

                const edges = notes.flatMap(sourceNote =>
                    sourceNote.references.map(targetId => ({
                        data: {source: sourceNote.id, target: targetId}
                    }))
                );
                cy.add(edges);

                cy.layout({name: 'cose'}).run();
                cy.fit(); // Fit viewport to graph after layout
            } catch (error) {
                systemLog.error(`Error updating graph: ${error}`, "GraphView"); // Error logging within updateGraph
            }
        };


        updateGraph();
        const unsubscribe = onSystemNoteChange(updateGraph);
        return () => {
            unsubscribe();
            if (cy) {
                cy.destroy();
                cyInstance.current = null;
                isGraphInitialized.current = false; // Reset initialization flag on unmount
            }
        };

    }, [system]);

    return (
        <div className={styles.graphView}>
            <h2>Note Graph Visualization 🕸️</h2>
            <div ref={cyRef} style={{height: '600px'}}/>
        </div>
    );
};