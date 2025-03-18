import React, { useCallback, useEffect, useState } from 'react';
import {TaskList} from './components/TaskList/TaskList';
import {ChatView} from './components/ChatView/ChatView';
import {SystemLog} from './components/SystemLog/SystemLog';
import {GraphView} from './components/GraphView/GraphView';
import {SettingsView} from './components/Settings/SettingsView';
import {TemplatesView} from './components/Templates/TemplatesView';
import {getSystemNote} from './lib/systemNote';
import {NoteImpl} from './lib/note';
import styles from './App.css';

const App: React.FC = () => {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const system = getSystemNote();
     const [activeView, setActiveView] = useState<'tasks' | 'graph' | 'settings' | 'templates'>('tasks');

     useEffect(() => {
         const initializeSystem = async () => {
             if (system.getAllNotes().length === 0) {
                 const rootNote = await NoteImpl.createRootNote({});
                 system.addNote(rootNote.data);

                 // Create a Task Note that uses the Echo Tool
                 const echoTaskNote = await NoteImpl.createTaskNote(
                     "Echo Task Test",
                     "This task will use the Echo Tool to echo back your input.",
                     75 // Medium-High priority
                 );
                 echoTaskNote.data.logic = JSON.stringify({
                     "steps": [
                         {
                             "id": "echoStep",
                             "type": "invoke", // Invoke a tool
                             "runnable": {
                                 "$type": "Tool",
                                 "name": "echo-tool" // Name of the Echo Tool Note
                             },
                             "input": {
                                 "input": "Hello from Echo Task!" // Input for the tool
                             }
                         }
                     ]
                 });
                 system.addNote(echoTaskNote.data);
             }
         };
         initializeSystem();
     }, [system]);

     const handleTaskSelect = useCallback((id: string | null) => {
         setSelectedTaskId(id);
     }, []);

     const handleEditNote = useCallback(() => { //TODO: Implement edit note
         // Logic for editing note can be added here if needed
     }, []);

     const renderView = () => {
         switch (activeView) {
             case 'tasks':
                 return <ChatView selectedTaskId={selectedTaskId}/>;
             case 'graph':
                 return <GraphView/>;
             case 'settings':
                 return <SettingsView/>;
             case 'templates':
                 return <TemplatesView/>;
             default:
                 return <div>Unknown View</div>;
         }
     };

     return (
         <div className={ styles.appContainer }>
             <header className={styles.appHeader}>
                 <h1>Netention v5 🚀</h1>
                 <nav className={styles.appNav}>
                     <button className={activeView === 'tasks' ? styles.activeViewButton : ''}
                             onClick={() => setActiveView('tasks')}>Tasks 📝
                     </button>
                     <button className={activeView === 'graph' ? styles.activeViewButton : ''}
                             onClick={() => setActiveView('graph')}>Graph View 🕸️
                     </button>
                     <button className={activeView === 'settings' ? styles.activeViewButton : ''}
                             onClick={() => setActiveView('settings')}>Settings ⚙️
                     </button>
                     <button className={activeView === 'templates' ? styles.activeViewButton : ''}
                             onClick={() => setActiveView('templates')}>Templates 📄
                     </button>
                 </nav>
             </header>

             <div className={styles.appBody}>
                 <TaskList onTaskSelect={handleTaskSelect} onEditNote={handleEditNote}/>
                 {renderView()}
             </div> {/* Main content area */}

             <SystemLog/>
         </div>
     );
 };

 export default App;
