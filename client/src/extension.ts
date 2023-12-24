"use strict";

import * as path from "path";
import {
  CancellationToken,
  ExtensionContext,
  Position,
  Range,
  Selection,
  SnippetString,
  TextEditorRevealType,
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

    let skipRevealNext = 0;

    window.onDidChangeTextEditorSelection(async (ev) => {
      if (skipRevealNext > 0) {
        skipRevealNext--;
        return;
      }
      if (tree.visible && ev.selections.length > 0 && !incorrectTree) {
        const nodeItems = provider.getNodeItemByPosition(
          ev.selections[0].start,
          ev.selections[0].end
        );
        if (nodeItems.length) {
          skipRevealNext += nodeItems.length;
        }
        for (let i = 0; i < nodeItems.length; i++) {
          await tree.reveal(nodeItems[i], {
            select: true,
            expand: true,
          });
        }
      }
    });

    const editor = window.activeTextEditor;

    commands.registerCommand("syntaxVisualizer.refreshEntry", () => {
      tree.message = undefined;
      incorrectTree = false;
      provider.refresh();
    });

    const propsProvider = new PropsViewProvider(context.extensionUri);

    tree.onDidChangeSelection((ev) => {
      if (ev.selection.length === 1) {
        const selectedTreeItem = ev.selection[0];
        const selectedItem = provider.getNodeById(selectedTreeItem.id);
        if (selectedItem) {
          const { item, nodes, id, ...data } = selectedItem;
          if (skipRevealNext <= 1) {
            propsProvider.selectNode(data);
          }
          if (skipRevealNext > 0) {
            skipRevealNext--;
            return;
          }
          if (editor) {
            // Specify the line and character position where you want to move the cursor
            const newStartPosition = new Position(
              selectedItem.lineStart,
              selectedItem.columnStart
            );
            const newEndPosition = new Position(
              selectedItem.lineEnd,
              selectedItem.columnEnd
            );

            // Create a new selection with the specified position
            const newSelection = new Selection(
              newStartPosition,
              newEndPosition
            );

            // Set the editor's selection to the new selection
            editor.selection = newSelection;

            // Scroll to the new cursor position
            editor.revealRange(
              new Range(newStartPosition, newEndPosition),
              TextEditorRevealType.InCenter
            );
            skipRevealNext++;
          }
        }
      }
    });

    context.subscriptions.push(
      window.registerWebviewViewProvider(
        PropsViewProvider.viewType,
        propsProvider
      )
    );
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

class PropsViewProvider implements WebviewViewProvider {
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
  }

  public selectNode(data: object) {
    if (this._view) {
      this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
      this._view.webview.postMessage({ type: "node", data: data });
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

				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
        <div class="welcome-view-content">
        <p>Select a node to see its properties.</p>
        </div>

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
