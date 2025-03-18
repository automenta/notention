import React from 'react';
import styles from './TemplatesView.module.css';
import {UIView} from '../UI/UI';
import { TemplateManager } from './TemplateManager';
import { ToolManager } from '../ToolManager/ToolManager';

// Functional component for the Templates View
export const TemplatesView: React.FC = () => {
    return (
        <UIView title="Templates 📄">
            <div className={styles.templatesViewContainer}>
                <TemplateManager/>
                <ToolManager/>
            </div>
        </UIView>
    );
};
