import * as fs from 'fs';
import path from 'path';

export const SAFE_DIRECTORY = path.resolve('./safe_files');
export const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.js'];

if (!fs.existsSync(SAFE_DIRECTORY)) {
    fs.mkdirSync(SAFE_DIRECTORY);
}
