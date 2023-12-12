"use strict";

import * as path from "path";
import {
  CancellationToken,
  ExtensionContext,
  SnippetString,
  Uri,
  Webview,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  commands,
  window,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient";
import { SyntaxNodeProvider } from "./syntaxNodeView";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverExe = "dotnet";
  const serverModule = (name: string) =>
    context.asAbsolutePath(
      path.join("server", "bin", name, "net7.0", "SyntaxVisualizer.dll")
    );

  let serverOptions: ServerOptions = {
    run: {
      command: serverExe,
      args: [serverModule("release")],
    },
    debug: {
      command: serverExe,
      args: [serverModule("debug")],
    },
  };

  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "csharp" }],
    progressOnInitialization: true,
    synchronize: {
      configurationSection: "syntaxVisualizerCSharp",
    },
  };

  client = new LanguageClient(
    "syntaxVisualizerCSharp",
    "Syntax Visualizer C#",
    serverOptions,
    clientOptions
  );
  client.start();

  client.onReady().then(() => {
    const getTree = (params: any) =>
      client.sendRequest<any>("syntaxVisualizer/getSyntaxTree", params);

    const provider = new SyntaxNodeProvider(getTree);

    const tree = window.createTreeView("syntax-visualizer", {
      treeDataProvider: provider,
      showCollapseAll: true,
    });

    let incorrectTree = false;

    client.onNotification("syntaxVisualizer/invalidTree", () => {
      tree.message = "Code was changed and saved - try to refresh.";
      incorrectTree = true;
    });

    client.onNotification("syntaxVisualizer/invalidTree2", () => {
      tree.message = "Code was changed - try to save it and refresh.";
      incorrectTree = true;
    });

    window.onDidChangeTextEditorSelection(async (ev) => {
      if (tree.visible && ev.selections.length > 0 && !incorrectTree) {
        const nodeItems = provider.getNodeItemByPosition(
          ev.selections[0].start,
          ev.selections[0].end
        );
        for (let i = 0; i < nodeItems.length; i++) {
          await tree.reveal(nodeItems[i], {
            select: true,
            expand: true,
          });
        }
      }
    });

    commands.registerCommand("syntaxVisualizer.refreshEntry", () => {
      tree.message = undefined;
      incorrectTree = false;
      provider.refresh();
    });

    const colorProvider = new ColorsViewProvider(context.extensionUri);

    context.subscriptions.push(
      window.registerWebviewViewProvider(
        ColorsViewProvider.viewType,
        colorProvider
      )
    );

    context.subscriptions.push(
      commands.registerCommand("calicoColors.addColor", () => {
        colorProvider.addColor();
      })
    );

    context.subscriptions.push(
      commands.registerCommand("calicoColors.clearColors", () => {
        colorProvider.clearColors();
      })
    );
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

class ColorsViewProvider implements WebviewViewProvider {
  public static readonly viewType = "syntax-visualizer-props";

  private _view?: WebviewView;

  constructor(private readonly _extensionUri: Uri) {}

  public resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    _token: CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "colorSelected": {
          window.activeTextEditor?.insertSnippet(
            new SnippetString(`#${data.value}`)
          );
          break;
        }
      }
    });
  }

  public addColor() {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: "addColor" });
    }
  }

  public clearColors() {
    if (this._view) {
      this._view.webview.postMessage({ type: "clearColors" });
    }
  }

  private _getHtmlForWebview(webview: Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "main.js")
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>

				<button class="add-color-button">Add Color</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
