const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const venvPython = path.join(__dirname, '../../../.venv/bin/python');
  const backendDir = path.join(__dirname, '../../backend');
  const runScript = path.join(backendDir, 'run.py');

  pythonProcess = spawn(venvPython, [runScript], {
    cwd: backendDir,
    stdio: 'inherit'
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
  });
}

app.whenReady().then(() => {
  startPythonBackend();
  
  // Wait a moment for the backend to start
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
