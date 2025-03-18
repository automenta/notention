// src/components/GraphView/GraphView.tsx
import React, {useEffect, useRef, useCallback} from 'react';
import cytoscape from 'cytoscape';
import {getSystemNote, onSystemNoteChange} from '../../lib/systemNote';
import styles from './GraphView.module.css';
import {systemLog} from "../../lib/systemLog";

export const GraphView: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstance = useRef<cytoscape.Core | null>(null);
    const system = getSystemNote();
    const isGraphInitialized = useRef(false);
    const isMounted = useRef(false);

    const updateGraph = useCallback(() => {
        if (!isMounted.current || !cyInstance.current) {
            systemLog.warn("Cytoscape instance is not valid or component unmounted, skipping graph update.", "GraphView");
            return;
        }

        const cy = cyInstance.current;

        if (cy.destroyed()) {
            systemLog.warn("Cytoscape instance was destroyed, skipping graph update.", "GraphView");
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
            cy.fit();
        } catch (error) {
            systemLog.error(`Error updating graph: ${error}`, "GraphView");
        }

    }, [system]);

    useEffect(() => {
        isMounted.current = true;

        if (!cyRef.current || isGraphInitialized.current) return;

        isGraphInitialized.current = true;
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

        updateGraph();

        const unsubscribe = onSystemNoteChange(() => {
            if (isMounted.current) {
                updateGraph();
            }
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
            if (cyInstance.current) {
                cyInstance.current.destroy();
                cyInstance.current = null;
                isGraphInitialized.current = false;
            }
        };

    }, [system, updateGraph]);

    return (
        <div className={styles.graphView}>
            <h2>Note Graph Visualization 🕸️</h2>
            <div ref={cyRef} style={{height: '600px'}}/>
        </div>
    );
};
