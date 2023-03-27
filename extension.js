const vscode = require("vscode");
const { setInterval, clearInterval } = require("timers");
const path = require("path");

let fileTimeTracker = {};
let interval;
let statusBarItem;

function getTableWebviewContent(data) {
  const rows = data
    .map(
      (item) =>
        `<tr><td>${item.file}</td><td>${item.timeSpent.toFixed(2)} seconds</td></tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #dddddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Time Spent</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function startTimer() {
  if (interval) {
    clearInterval(interval);
  }

  interval = setInterval(() => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const fileName = editor.document.fileName;
      if (!fileTimeTracker[fileName]) {
        fileTimeTracker[fileName] = 0;
      }
      fileTimeTracker[fileName]++;
      updateStatusBar();
    }
  }, 1000);
}

function stopTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function updateStatusBar() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.show();
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const fileName = editor.document.fileName;
    const timeSpent = fileTimeTracker[fileName] || 0;
    const hours = Math.floor(timeSpent / 3600);
    const minutes = Math.floor((timeSpent % 3600) / 60);
    const seconds = timeSpent % 60;
    statusBarItem.text = `Time: ${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    statusBarItem.text = "";
  }
}

function showTimeTable() {
  const panel = vscode.window.createWebviewPanel(
    "heatmap",
    "File Heatmap",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(__dirname, "d3.v6.min.js")),
      ],
    }
  );

  const fileNames = Object.keys(fileTimeTracker);
  const heatmapData = fileNames.map((fileName) => {
    const timeSpent = fileTimeTracker[fileName];
    let color;

    if (timeSpent < 60) {
      color = "green";
    } else if (timeSpent < 180) {
      color = "yellow";
    } else {
      color = "red";
    }

    return { file: fileName, timeSpent: timeSpent, color: color };
  });

  heatmapData.sort((a, b) => b.timeSpent - a.timeSpent);

  panel.webview.html = getTableWebviewContent(
    heatmapData
  );
}

function activate(context) {
	// ... other event listeners and commands
	startTimer();

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(startTimer));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(startTimer));
  context.subscriptions.push(vscode.window.onDidChangeWindowState(e => {
    if (e.focused) {
      startTimer();
    } else {
      stopTimer();
    }
  }));
	context.subscriptions.push(vscode.commands.registerCommand('extension.showTimeTable', () => showTimeTable()));
	context.subscriptions.push(statusBarItem);
  }

exports.activate = activate;

function deactivate() {
  stopTimer();
}
exports.deactivate = deactivate;
