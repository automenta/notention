type LogLevel = 'info' | 'warning' | 'error' | 'debug';
type Listener = () => void;

class SystemLog {
  private logBuffer: string[] = [];
  private listeners: Listener[] = [];
  private maxHistory = 1000;

  addListener = (listener: Listener) => this.listeners.push(listener);
  removeListener = (listener: Listener) => this.listeners.splice(this.listeners.indexOf(listener), 1);
  notifyListeners = () => this.listeners.forEach(listener => listener());

  log = (level: LogLevel, message: string, source?: string) => {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] - ${level.toUpperCase()} - `;
    if (source) formattedMessage += `[${source}] `;
    formattedMessage += message;

    let coloredMessage = formattedMessage;
    switch (level) {
      case 'error': coloredMessage = `[31m${formattedMessage}[0m`; break;
      case 'warning': coloredMessage = `[33m${formattedMessage}[0m`; break;
      case 'debug': coloredMessage = `[34m${formattedMessage}[0m`; break;
      case 'info': coloredMessage = `[37m${formattedMessage}[0m`; break;
    }
    console.log(coloredMessage);

    this.logBuffer.push(formattedMessage);
    if (this.logBuffer.length > this.maxHistory) this.logBuffer.shift();
    this.notifyListeners();
  };

  info = (message: string, source?: string) => this.log('info', message, source);
  warn = (message: string, source?: string) => this.log('warning', message, source);
  error = (message: string, source?: string) => this.log('error', message, source);
  debug = (message: string, source?: string) => this.log('debug', message, source);
  getLogHistory = () => [...this.logBuffer];
  clearLogHistory = () => { this.logBuffer = []; this.notifyListeners(); };
}

export const systemLog = new SystemLog();
