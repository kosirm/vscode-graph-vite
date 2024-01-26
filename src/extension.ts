import { match } from 'assert';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('smGraph.start', () => {
			SMGraphPanel.createOrShow(context.extensionUri);
		})
	);

	const reverseCommand = "smGraph.reverse";
	const reverseSelected = vscode.commands.registerCommand(
		reverseCommand,
		reverseSelectedText
	);
	context.subscriptions.push(reverseSelected);

	const setSMGraphDataCommand = "smGraph.setSMGraphData";
	const setSMGraphDataCMD = vscode.commands.registerCommand(
		setSMGraphDataCommand,
		setSMGraphData
	);
	context.subscriptions.push(setSMGraphDataCMD);

	const createFileCommand = "smGraph.createFile";
	const createFileCMD = vscode.commands.registerCommand(
		createFileCommand,
		createFile
	);
	context.subscriptions.push(createFileCMD);

	// ok, ove akcije treba poimenovati i kao takve onda poslati u iframe
	// znači treba mi imena za akcije i onda neki shortcuti, koji su logični i ne kose se previše sa klasičnim shortcutima
	// TODO addNodeToogle (alt+Q), addEdgeToogle(alt+W), deleteSelected(alt+d), propertiesToogle(alt+A), 
	// TODO graph2json(alt+j), json2graph(alt+k), 
	// TODO simulationStart, simulationNext, simulationBack, simulationRestart -> ovo dolazi kasnije
	// keys: alt + Q W A G Y X C B N

	context.subscriptions.push(vscode.commands.registerCommand('smGraph.addNodeToggle', () => { if (SMGraphPanel.currentPanel) { SMGraphPanel.currentPanel.addNodeToggle(); } }));
	context.subscriptions.push(vscode.commands.registerCommand('smGraph.addEdgeToggle', () => { if (SMGraphPanel.currentPanel) { SMGraphPanel.currentPanel.addEdgeToggle(); } }));
	context.subscriptions.push(vscode.commands.registerCommand('smGraph.deleteSelected', () => { if (SMGraphPanel.currentPanel) { SMGraphPanel.currentPanel.deleteSelected(); } }));
	context.subscriptions.push(vscode.commands.registerCommand('smGraph.propertiesToogle', () => { if (SMGraphPanel.currentPanel) { SMGraphPanel.currentPanel.propertiesToogle(); } }));

	context.subscriptions.push(vscode.commands.registerCommand('smGraph.json2graph', () => { if (SMGraphPanel.currentPanel) { SMGraphPanel.currentPanel.json2graph(); } }));
	// context.subscriptions.push(vscode.commands.registerCommand('smGraph.graph2json', () => {if (SMGraphPanel.currentPanel) {SMGraphPanel.currentPanel.graph2json();}}));


	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(SMGraphPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				// //console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				SMGraphPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}

	const reveal = JSON.stringify(vscode.workspace.getConfiguration().get('workbench.editor.revealIfOpen'));
	// vscode.window.showInformationMessage(reveal);
	if (reveal === 'false') {
		vscode.workspace.getConfiguration().update('workbench.editor.revealIfOpen', true);
	}
}
// TODO  clean whole file
var dataLoadedInGraph = false;
var activeLine = vscode.window.activeTextEditor.selection.active.line;
var oldActiveLine = vscode.window.activeTextEditor.selection.active.line;
var currentEditor: vscode.TextEditor;
var change = false;
vscode.workspace.onDidOpenTextDocument((e) => {
	change = true;
});
vscode.workspace.onDidCloseTextDocument((e) => {
	change = true;
});
// vscode.window.onDidChangeWindowState((e)=>{
// 	change = true;
// });
vscode.window.onDidChangeActiveTextEditor((e) => {
	change = true;
});
vscode.window.onDidChangeTextEditorViewColumn((e) => {
	change = true;
});
vscode.workspace.onDidChangeTextDocument(function (e) {
	change = true;
});
const decorationType = vscode.window.createTextEditorDecorationType({
	// backgroundColor: 'rgba(17, 224, 89, 0.17)',
	border: '2px solid rgba(58, 167, 58,1)',
});
vscode.window.onDidChangeTextEditorSelection((e) => {
	currentEditor = vscode.window.activeTextEditor;
	activeLine = currentEditor.selection.active.line;
	if (SMGraphPanel.currentPanel && currentEditor.document.fileName.includes(".sm.json")) {
		// json2graph pozovem samo, ako je file promjenjen
		console.log("Change? ", change);
		if (change) {
			SMGraphPanel.currentPanel.json2graph();
			change = false;
		}
		if (activeLine === oldActiveLine) { return; }
		//console.log("Active Line: ", activeLine);
		if (currentEditor && dataLoadedInGraph === true) {
			const { text } = currentEditor.document.lineAt(activeLine);
			var line = vscode.window.activeTextEditor!.selection.active.line;
			const rangeStart = currentEditor.document.lineAt(activeLine).range.start.character;
			const rangeEnd = currentEditor.document.lineAt(activeLine).range.end.character;
			var range = new vscode.Range(line, rangeStart, line, rangeEnd);
			if (text.includes('"x":')) {
				currentEditor.setDecorations(decorationType, [range]);
				var id = text.match(/^.*\{"id":"(.*?)"/);
				var hid = id[1];
				// console.log("HID (onDidChangeTextEditorSelection): ",hid);
				SMGraphPanel.currentPanel.json2graph();
				SMGraphPanel.currentPanel.highlightNodeOnGraph(hid);
				// ovdje mogu zvat samo updateNode,ali zašto, ako sada radi kako treba? Pored toga gubim oldActiveLine
			}
			else if (text.includes('"to":')) {
				currentEditor.setDecorations(decorationType, [range]);
				var id = text.match(/^.*\{"id":"(.*?)"/);
				var hid = id[1];
				// console.log("HID (onDidChangeTextEditorSelection): ",hid);
				SMGraphPanel.currentPanel.json2graph();
				SMGraphPanel.currentPanel.highlightEdgeOnGraph(hid);
			}
			else {
				currentEditor.setDecorations(decorationType, []);
				//console.log("Niti jedno...");
			}
			oldActiveLine = activeLine;
		}

	}
	else {
		//console.log("Not sm.graph or panel not opened");
	};
});

function isJsonString(str: string) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}
// set data which will be sent to webview

function setSMGraphData() {
	// ovo treba očistiti, ne treba 10 puta provjeravati istu stvar
	// TODO najprije treba vidjeti da li je file valid JSON, ako nije (npr neka štamparska greška) treba obavijestiti o tome
	if (vscode.window.activeTextEditor.document.uri.path.includes(".sm.json")) {
		dataLoadedInGraph = true;
		const editor = vscode.window.activeTextEditor;
		var documentText;
		if (editor) {
			const document = editor.document;
			//check if file is empty
			if (document.getText() === "") {
				vscode.window.showInformationMessage('File is empty');
				return;
			}
			else {
				// TODO najprije provjeriti, da li je valid JSON
				if (isJsonString(document.getText())) {
					documentText = JSON.parse(document.getText());
					console.log("Document text (setSMGraphData): ", documentText);
					return documentText;
				}
				else {
					vscode.window.showInformationMessage('Not valid JSON, please check spelling.');
				}

			}
		}
	}
	else {
		//console.log("Not sm.json file");
	};
}

function findOpenedFiles() {
	// WorkspaceConfiguration update workbench.editor.revealIfOpen = true
}

function findFile() {

}

async function createFile() {
	const fileName = await vscode.window.showInputBox({
		title: 'Save File',
		prompt: 'Enter a file name (no extension):',
		validateInput: (value) => {
			if (value.length === 0) {
				return 'Please enter a file name';
			}
			return null;
		}
	});

	const wsedit = new vscode.WorkspaceEdit();
	const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const filePath = vscode.Uri.file(wsPath + '/' + fileName + '.sm.json');

	var data = `
	{
		"file":"${fileName}.sm.json",
		"nodes":[],
		"edges":[]
	}
	`;
	wsedit.createFile(filePath, { ignoreIfExists: true }, { iconPath: new vscode.ThemeIcon("json"), label: "State Graph", needsConfirmation: false });
	vscode.workspace.applyEdit(wsedit).then(success => {
		if (success) {
			// vscode.window.showInformationMessage('Created a new file: ' + filePath.toString());
			// newFilePath = filePath;
			vscode.workspace.openTextDocument(filePath).then((doc: vscode.TextDocument) => {
				vscode.window.showTextDocument(doc, 1, false).then(doc => {
					doc.edit(edit => {
						edit.insert(new vscode.Position(0, 0), data);
					});
				});
			})
				.then(undefined, err => {
					vscode.window.showErrorMessage(err);
				});
		} else {
			vscode.window.showInformationMessage('Failed to create a new file: ' + filePath);
		}
	});
}
// ok, za jedan node ili edge highlight mi treba druga funkcija
function getSMGraphNodeOrEdge(data: string) {
	// console.log("file: ",data[0]);
	// console.log("node: ",data[1]);
	var dataobj = JSON.parse(data[1]);

}
// TODO ovo treba popraviti: ako je file zatvoren, imam error
function graph2json(data: string) {
	var dataobj = JSON.parse(data);
	// var nodes = dataobj.nodes;
	// var edges = dataobj.edges;
	var file = dataobj.file;
	console.log("graph2json data", data);

	var inputs = vscode.window.tabGroups.all.flatMap(({ tabs }) => tabs.map(tab => tab.input));
	for (var input of inputs) {
		Object.entries(input).forEach(function ([key, value]) {
			if (key === "uri" && value.toString().includes(file)) {
				var setting: vscode.Uri = value.fsPath;
				vscode.workspace.openTextDocument(setting).then((doc: vscode.TextDocument) => {
					vscode.window.showTextDocument(doc, 1, false)
						.then(e => {
							e.edit(edit => {
								const lines = doc.getText().split('\n');
								for (let i = 0; i < lines.length; i++) {
									const line = lines[i];
								}
								var firstLine = doc.lineAt(0);
								var lastLine = doc.lineAt(doc.lineCount - 1);
								var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
								edit.delete(textRange);
								edit.insert(new vscode.Position(0, 0), data);
							});
						});
				});
				// TODO GET FILE & FOLDER
				var folders = vscode.workspace.workspaceFolders;
				//console.log("FOLDERS: ", folders);
				var fd = vscode.workspace.getWorkspaceFolder;
				//console.log("GET FOLDER: ", fd);
			}
			else {
				//console.log("FILE NIJE OTVOREN: ");
			}
		});
	}
}

function reverseSelectedText() {
	const editor = vscode.window.activeTextEditor;

	if (editor) {
		const document = editor.document;
		const selection = editor.selection;

		const text = document.getText(selection);
		const reversed = text.split("").reverse().join("");

		editor.edit((editBuilder) => {
			editBuilder.replace(selection, reversed);
		});
	}
}
function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

/**
 * Manages  webview panels
 */
class SMGraphPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: SMGraphPanel | undefined;

	public static readonly viewType = 'smGraph';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		//ovdje trebam nalovdati podatke... a promjeniti kad se mjenja file
		const column = vscode.ViewColumn.Two;
		//console.log("column: ", column.toString());

		// If we already have a panel, show it.
		if (SMGraphPanel.currentPanel) {
			SMGraphPanel.currentPanel._panel.reveal(column);
			SMGraphPanel.currentPanel.json2graph();
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			SMGraphPanel.viewType,
			'SM Graph',
			vscode.ViewColumn.Two,
			getWebviewOptions(extensionUri),
		);

		SMGraphPanel.currentPanel = new SMGraphPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		SMGraphPanel.currentPanel = new SMGraphPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();
		this.json2graph();
		// this._loadData();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						return;
					case 'graph':
						graph2json(message.text);
						return;
					case 'selected':
						getSMGraphNodeOrEdge(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public json2graph() {
		currentEditor = vscode.window.activeTextEditor;
		console.log("currentEditor file name (json2graph): ", currentEditor.document.fileName);
		if (currentEditor.document.fileName.includes(".sm.json")) {
			this._panel.webview.postMessage({ command: 'json2graph', data: setSMGraphData() });
		}
	}
	// koliko razumijem, check imam več gore, prije nego to zovem
	public addNodeToggle() { this._panel.webview.postMessage({ command: 'addNodeToogle', data: [] }); };
	public addEdgeToggle() { this._panel.webview.postMessage({ command: 'addEdgeToogle', data: [] }); };
	public deleteSelected() { this._panel.webview.postMessage({ command: 'deleteSelected', data: [] }); };
	public propertiesToogle() { this._panel.webview.postMessage({ command: 'propertiesToogle', data: [] }); };

	public highlightNodeOnGraph(id: string) { this._panel.webview.postMessage({ command: 'highlightNodeOnGraph', data: id }); }
	public highlightEdgeOnGraph(id: string) { this._panel.webview.postMessage({ command: 'highlightEdgeOnGraph', data: id }); }


	public dispose() {
		SMGraphPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();
		dataLoadedInGraph = false;
		//console.log("Panel zatvoren, dataLoadedInGraph: ", dataLoadedInGraph);

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.title = "SM Graph";
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}


	private _getHtmlForWebview(webview: vscode.Webview) {
		//#region SCRIPTS

		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
		const visPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'vis-network.min.js');
		const shortIdPathPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'short-unique-id.min.js');
		const winboxPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'winbox.bundle.min.js');
		const alpinePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'alpine.min.js');
		const fsmPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'state-machine.min.js');
		const dataPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'data.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const visUri = webview.asWebviewUri(visPathOnDisk);
		const shortIdUri = webview.asWebviewUri(shortIdPathPathOnDisk);
		const winboxUri = webview.asWebviewUri(winboxPathOnDisk);
		const alpineUri = webview.asWebviewUri(alpinePathOnDisk);
		const fsmUri = webview.asWebviewUri(fsmPathOnDisk);
		const dataUri = webview.asWebviewUri(dataPathOnDisk);
		//#endregion SCRIPTS

		//#region STYLES
		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
		const stylesPathVisPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vis.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
		const stylesVisUri = webview.asWebviewUri(stylesPathVisPath);
		//#endregion STYLES

		// Icons
		// const iconsPath = vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css');
		// const iconsUri = webview.asWebviewUri(iconsPath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		//#region HTLM
		return /*html*/`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src ${webview.cspSource} 'unsafe-inline'; img-src 'self' data: https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
				<link href="${stylesVisUri}" rel="stylesheet">
								
				<title>SM Graph</title>	
				<script nonce="${nonce}" src="${visUri}"></script>
				<script nonce="${nonce}" src="${shortIdUri}"></script>
				<script nonce="${nonce}" src="${winboxUri}"></script>
				<script nonce="${nonce}" src="${fsmUri}"></script>
				
				<script nonce="${nonce}" src="${dataUri}"></script>
				<script defer nonce="${nonce}" src="${alpineUri}"></script>
				</head>
				<body>
				<!-- #region HTLM -->
					<div class="wrapper">
						<div id="network" data-vscode-context='{"preventDefaultContextMenuItems": true}'></div>
					</div>
				<!-- #endregion HTLM -->
				<div class="iconbar">
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M15.62 3.596L7.815 12.81l-.728-.033L4 8.382l.754-.53l2.744 3.907L14.917 3z"/><path d="m7.234 8.774l4.386-5.178L10.917 3l-4.23 4.994zm-1.55.403l.548.78l-.547-.78zm-1.617 1.91l.547.78l-.799.943l-.728-.033L0 8.382l.754-.53l2.744 3.907l.57-.672z"/></g></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g fill="currentColor"><path d="M3 1v.5c0 .47.274.706.8 1.1l.04.03C4.314 2.985 5 3.498 5 4.5V5H4v-.5c0-.47-.274-.706-.8-1.1l-.04-.03C2.686 3.015 2 2.502 2 1.5V1zm3 0v.5c0 .47.274.706.8 1.1l.04.03C7.314 2.985 8 3.498 8 4.5V5H7v-.5c0-.47-.274-.706-.8-1.1l-.04-.03C5.686 3.015 5 2.502 5 1.5V1zm3 0v.5c0 .47.274.706.8 1.1l.04.03c.474.355 1.16.868 1.16 1.87V5h-1v-.5c0-.47-.274-.706-.8-1.1l-.04-.03C8.686 3.015 8 2.502 8 1.5V1z"/><path fill-rule="evenodd" d="m2 7l1-1h10.5a2.5 2.5 0 0 1 0 5h-.626A4.002 4.002 0 0 1 9 14H6a4 4 0 0 1-4-4zm10 3V7H3v3a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3m1-3v3h.5a1.5 1.5 0 0 0 0-3z" clip-rule="evenodd"/></g></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
					<div id="fi" class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M14.5 1h-13l-.5.5v3l.5.5H2v8.5l.5.5h11l.5-.5V5h.5l.5-.5v-3zm-1 3H2V2h12v2zM3 13V5h10v8zm8-6H5v1h6z" clip-rule="evenodd"/></svg></div>
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
		//#endregion HTLM

	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
