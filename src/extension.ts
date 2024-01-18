import * as vscode from 'vscode';
import JSON5 from 'json5';

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

	context.subscriptions.push(
		vscode.commands.registerCommand('smGraph.sendDataToWebview', () => {
			if (SMGraphPanel.currentPanel) {
				SMGraphPanel.currentPanel.sendDataToWebview();
			}
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(SMGraphPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				// console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				SMGraphPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}
//! ovo radi --- CRAZY !!! --- ali ovo dolazi kasnije, za sada mi još ne treba...
//! pogotovo jer je prilično opasno, jer user može JSON formatirati na sto načina...
//! OPASNO JE IČI NA LINE LENGTH, JER KORISNIK MOŽE FORMATIRATI JSON VERTIKALNO...
//! ZBOG TOGA TRAŽIM DRUGI NAČIN NEŠTO KAO FIND IN FILES
var dataLoadedInGraph = false;
vscode.window.onDidChangeTextEditorSelection((e) => {
	// console.log('selection', e);
	const editor = vscode.window.activeTextEditor;
	if (editor && dataLoadedInGraph === true) {
		if (e.textEditor.document.uri.path.includes("smgraph.js")) {
			// console.log(e);
			const { text } = editor.document.lineAt(editor.selection.active.line);
			if (text.includes('$:1')) {
				var id = text.match(/^.*\{id:'(.*?)'/);
				console.log("regex id",id);
				var hid = id[1];
				// ok prije nego pošaljem podatke, trebam provjeriti, da li je SMGraph uopče otvoren
				// pored toga, da li je graph u njemu...
				// console.log("dataLoadedInGraph", dataLoadedInGraph);
				SMGraphPanel.currentPanel.highlightNodeOnGraph(hid);
			}
			else if (text.includes('$:2')) {
				var id = text.match(/^.*\{id:'(.*?)'/);
				var hid = id[1];
				SMGraphPanel.currentPanel.highlightEdgeOnGraph(hid);
			}
			else {
				console.log("Niti jedno...");
			}
			// nakon ovoga mogu poslati line u graf
			// var myIdArr = text.match(/^[^\d]*(\d+)/);
			// if (myIdArr![1]){
			// 	var myId = myIdArr![1];
			// 	console.log("ID: ",myId);
			// }
			var currentLine = e.selections[0].active.line;
			var curLineStart = new vscode.Position(currentLine, 0);
			var nextLineStart = new vscode.Position(currentLine + 1, 0);
			var rangeWithFirstCharOfNextLine = new vscode.Range(curLineStart, nextLineStart);
			var contentWithFirstCharOfNextLine = editor.document.getText(rangeWithFirstCharOfNextLine);
			var currentLineLength = contentWithFirstCharOfNextLine.length - 1;
			// console.log("currentLine: ", currentLine);
			// console.log("currentLineLength: ", currentLineLength);
			// console.log("currentLine TxT: ", text);
		}
	}
	// console.log(vscode.window.activeTextEditor?.selections);
});

//! ovo če biti korisno (možda) samo za editiranje JSON-a
// vscode.workspace.onDidChangeTextDocument(handleChange);
// function handleChange(event: any) {
// 	const editor = vscode.window.activeTextEditor;
// 	if (editor) {
// 		let documentEventJSON = JSON.stringify(event);
// 		if(documentEventJSON.includes("smgraph.js")){
// 			// console.log(documentEventJSON);
// 			// ali bojim se da to vrijedi samo za redak, koji se editira...
// 			// znači ipak trebam pogledat, kako radi onaj highlighter...
// 			//! kako sam glup... ime eventa je onDidChangeTextDocument !!! znači sve se to događa samo kod editiranja
// 			//! za kurzor mi treba neki drug event
// 			// ok, ovdje dobije text, mogu sparsati ID i napraviti highlight/zoom/itd na vis.js
// 			const { text } = editor.document.lineAt(editor.selection.active.line);
// 			console.log(JSON.stringify(text));
// 			if (event.contentChanges.length > 0) {
// 					// a ovdje mogu sparsati line i poslati update za node/edge
// 					console.log(JSON.stringify(text));
// 				}
// 			}
// 		}
// }

function setSMGraphData() {
	// FUTURE STATES:
	// check if SMGraph is opened
	// check if smgraph.js is opened
	dataLoadedInGraph = true;
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const document = editor.document;
		const documentText = JSON5.parse(document.getText());
		return documentText;
	}
}

function createFile() {
	const wsedit = new vscode.WorkspaceEdit();
	const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath; 
	const filePath = vscode.Uri.file(wsPath + '/new.stategraph');
	// vscode.window.showInformationMessage(filePath.toString());
	wsedit.createFile(filePath, { ignoreIfExists: true },{iconPath: new vscode.ThemeIcon("json"), label:"State Graph", needsConfirmation: false });
	vscode.workspace.applyEdit(wsedit);
	// vscode.window.showInformationMessage('Created a new file: hello/world.md');
}
// ovdje primam podatke iz webview-a (alt + ć)
function getSMGraphData(data: string) {
	const tabArray = vscode.window.tabGroups.all;
	const firstGroupOfTabs = tabArray[0].tabs;
	// vscode.window.showInformationMessage(firstGroupOfTabs.length.toString());
	let tabLength = firstGroupOfTabs.length;
	var tabIndex!: number;
	for (var i = 0; i < tabLength; i++) {
		if (firstGroupOfTabs[i].label === "smgraph.js") {
			tabIndex = i;
			// vscode.window.showInformationMessage(tabIndex.toString());
		}
	}
	const smGraphTabName = firstGroupOfTabs[tabIndex].label;
	if (smGraphTabName === "smgraph.js") {
		const firstTabInput = (firstGroupOfTabs[tabIndex].input as vscode.TabInputText).uri;

		var setting: vscode.Uri = firstTabInput;
		vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
			vscode.window.showTextDocument(a, 1, false).then(e => {
				e.edit(edit => {
					const lines = a.getText().split('\n');
					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						// console.log(i, line);
					}
					var firstLine = a.lineAt(0);
					var lastLine = a.lineAt(a.lineCount - 1);
					var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
					edit.delete(textRange);
					edit.insert(new vscode.Position(0, 0), data);
				});
			});
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
		// Enable javascript in the webview
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
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (SMGraphPanel.currentPanel) {
			SMGraphPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			SMGraphPanel.viewType,
			'SM Graph',
			/*column ||*/ vscode.ViewColumn.Two,
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

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		// ovo pošaljem iz webview-a sa sendNodesToCode
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						return;
					case 'nodes':
						getSMGraphData(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public sendDataToWebview() {
		// E ovdje mogu poslati strukturu vis.js networka...
		// ali kako ovu funkciju doseči izvana?
		this._panel.webview.postMessage({ command: 'sendDataToWebview', data: setSMGraphData() });
	}

	public highlightNodeOnGraph(id: string) { this._panel.webview.postMessage({ command: 'highlightNodeOnGraph', data: id }); }
	public highlightEdgeOnGraph(id: string) { this._panel.webview.postMessage({ command: 'highlightEdgeOnGraph', data: id }); }


	public dispose() {
		SMGraphPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();
		dataLoadedInGraph = false;
		console.log("Panel zatvoren, dataLoadedInGraph: ", dataLoadedInGraph);

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
		const winboxPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'winbox.bundle.min.js');
		const alpinePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'alpine.min.js');
		const fsmPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'state-machine.min.js');
		const json5PathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'json5.min.js');
		const dataPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'data.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const visUri = webview.asWebviewUri(visPathOnDisk);
		const winboxUri = webview.asWebviewUri(winboxPathOnDisk);
		const alpineUri = webview.asWebviewUri(alpinePathOnDisk);
		const fsmUri = webview.asWebviewUri(fsmPathOnDisk);
		const json5Uri = webview.asWebviewUri(json5PathOnDisk);
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
				<script nonce="${nonce}" src="${winboxUri}"></script>
				<script nonce="${nonce}" src="${fsmUri}"></script>
				<script nonce="${nonce}" src="${json5Uri}"></script>
				
				<script nonce="${nonce}" src="${dataUri}"></script>
				<script defer nonce="${nonce}" src="${alpineUri}"></script>
				</head>
				<body>
				<!-- #region HTLM -->
					<div class="wrapper">
						<div id="network"></div>
					</div>
				<!-- #endregion HTLM -->
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
