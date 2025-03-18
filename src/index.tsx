import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {initializeSystemNote} from './lib/systemNote';
import { ChatOpenAI } from "langchain/chat_models/openai";

const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
const usePersistence = localStorage.getItem('usePersistence') === 'true' || false;

if (!apiKey) {
    console.error("OpenAI API key not found in environment variables.  Please set REACT_APP_OPENAI_API_KEY.");
}

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);

if (apiKey) {
    const llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: "gpt-3.5-turbo",
        temperature: 0.7
    });
    initializeSystemNote(llm, usePersistence); // Initialize SystemNote with LLM and persistence setting
} else {
    console.warn("No OpenAI API key found. The system will run without LLM functionality.");
    initializeSystemNote({} as any, usePersistence); // Initialize SystemNote without LLM and persistence setting
}
