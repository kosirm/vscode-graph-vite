import * as vscode from 'vscode';

const cats = {
	'SM Graph': 'one',
	'Mindmap': 'two',
	'JSSM': 'three'
};

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('smGraph.start', () => {
			SMGraphPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('smGraph.talkToMe', () => {
			if (SMGraphPanel.currentPanel) {
				SMGraphPanel.currentPanel.talkToMe();
			}
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(SMGraphPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				SMGraphPanel.revive(webviewPanel, context.extensionUri);
			}
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
 * Manages cat coding webview panels
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
			column || vscode.ViewColumn.One,
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

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public talkToMe() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		// E ovdje mogu poslati strukturu vis.js networka...
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		SMGraphPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
				this._updateForCat(webview, 'Mindmap');
				return;

			case vscode.ViewColumn.Three:
				this._updateForCat(webview, 'JSSM');
				return;

			case vscode.ViewColumn.One:
			default:
				this._updateForCat(webview, 'SM Graph');
				return;
		}
	}

	private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
		this._panel.title = catName;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
//#region SCRIPTS
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
		const visPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'vis-network.min.js');
		const winboxPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'winbox.bundle.min.js');
		const alpinePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'alpine.min.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const visUri = webview.asWebviewUri(visPathOnDisk);
		const winboxUri = webview.asWebviewUri(winboxPathOnDisk);
		const alpineUri = webview.asWebviewUri(alpinePathOnDisk);
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

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

//#region HTLM
		return `<!DOCTYPE html>
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
				<script defer nonce="${nonce}" src="${alpineUri}"></script>
				</head>
				<body>
				<!-- #region HTLM -->
					<div class="wrapper">
						<div id="network"></div>
						<div id="minimapWrapper" 
							style="position: absolute; margin: 5px; border: 1px solid #ddd; overflow: hidden; background-color: #FFF; z-index: 9;" class="minimapWrapperIdle">
							<img id="minimapImage" class="minimapImage">
							<div id="minimapRadar" class="minimapRadar"></div>
						</div>
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
