import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {initializeSystemNote} from './lib/systemNote';

initializeSystemNote({} as any); // Initialize SystemNote without LLM for now

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);
