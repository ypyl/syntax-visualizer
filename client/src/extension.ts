"use strict";

import * as path from "path";
import {
  CancellationToken,
  ExtensionContext,
  Position,
  Range,
  Selection,
  TextEditorRevealType,
  Uri,
  Webview,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  commands,
  window,
  workspace,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient";
import { SyntaxNodeProvider } from "./syntaxNodeView";

// Initialize LanguageClient instance
let client: LanguageClient;

// Function to activate the extension
export function activate(context: ExtensionContext) {
  // Define server information
  const serverExe = "dotnet";
  const serverModule = (name: string) =>
    context.asAbsolutePath(
      path.join("server", "bin", name, "net7.0", "SyntaxVisualizer.dll")
    );

  // Configure server options
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

  // Configure client options
  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "csharp" }],
    progressOnInitialization: true,
    synchronize: {
      configurationSection: "syntaxVisualizerCSharp",
    },
  };

  // Create LanguageClient instance
  client = new LanguageClient(
    "syntaxVisualizerCSharp",
    "Syntax Visualizer C#",
    serverOptions,
    clientOptions
  );
  client.start();

  // Execute when the client is ready
  client.onReady().then(() => {
    // Get the active text editor
    let editor = window.activeTextEditor;

    // Function to get the syntax tree from the client
    const getTree = (params: any) => {
      return client.sendRequest<any>("syntaxVisualizer/getSyntaxTree", {
        text: editor?.document.getText(),
      });
    };

    // Create SyntaxNodeProvider instance
    const provider = new SyntaxNodeProvider(getTree);

    // Create and configure tree view
    const tree = window.createTreeView("syntax-visualizer", {
      treeDataProvider: provider,
      showCollapseAll: true,
    });


    // Handle changes in text editor selection
    window.onDidChangeTextEditorSelection(async (ev) => {
      if (tree.visible && ev.selections.length > 0) {
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

    window.onDidChangeActiveTextEditor((e) => {
      if (e?.document.fileName.endsWith("cs")) {
        editor = e;
        tree.message = undefined;
        provider.refresh();
      } else {
        editor = undefined;
        provider.reset();
      }
    });

    workspace.onDidChangeTextDocument(e => {
      if (e.document.fileName === editor?.document.fileName) {
        tree.message = undefined;
        provider.refresh();
      }
    })

    // Register command to refresh the tree view
    commands.registerCommand("syntaxVisualizer.refreshEntry", () => {
      tree.message = undefined;
      provider.refresh();
    });

    // Create PropsViewProvider instance
    const propsProvider = new PropsViewProvider(context.extensionUri);

    // Handle tree view selection changes
    tree.onDidChangeSelection((ev) => {
      if (ev.selection.length === 1) {
        const selectedTreeItem = ev.selection[0];
        const selectedItem = provider.getNodeById(selectedTreeItem.id);
        if (selectedItem) {
          const { item, nodes, id, ...data } = selectedItem;
          propsProvider.selectNode(data);
          // if (editor) {
          //   // Specify the line and character position where you want to move the cursor
          //   const newStartPosition = new Position(
          //     selectedItem.lineStart,
          //     selectedItem.columnStart
          //   );
          //   const newEndPosition = new Position(
          //     selectedItem.lineEnd,
          //     selectedItem.columnEnd
          //   );

          //   // Create a new selection with the specified position
          //   const newSelection = new Selection(
          //     newStartPosition,
          //     newEndPosition
          //   );

          //   // Set the editor's selection to the new selection
          //   editor.selection = newSelection;

          //   // Scroll to the new cursor position
          //   editor.revealRange(
          //     new Range(newStartPosition, newEndPosition),
          //     TextEditorRevealType.InCenter
          //   );
          // }
        }
      }
    });

    // Register webview view provider
    context.subscriptions.push(
      window.registerWebviewViewProvider(
        PropsViewProvider.viewType,
        propsProvider
      )
    );
  });
}

// Function to deactivate the extension
export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

// Class for providing webview view for node properties
class PropsViewProvider implements WebviewViewProvider {
  public static readonly viewType = "syntax-visualizer-props";

  private _view?: WebviewView;

  constructor(private readonly _extensionUri: Uri) {}

  // Resolve webview view
  public resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    _token: CancellationToken
  ) {
    this._view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Set HTML content for the webview
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  // Send selected node data to the webview
  public selectNode(data: object) {
    if (this._view) {
      this._view.show?.(true);
      this._view.webview.postMessage({ type: "node", data: data });
    }
  }

  // Generate HTML content for the webview
  private _getHtmlForWebview(webview: Webview) {
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "main.js")
    );

    const styleResetUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, "media", "main.css")
    );

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

// Function to generate a nonce
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
