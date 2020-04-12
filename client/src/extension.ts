'use strict';

import { ExtensionContext, commands, window } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient';
import { SyntaxNodeProvider } from './syntaxNodeView';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  let serverExe = 'dotnet';

  let serverOptions: ServerOptions = {
    run: {
      command: serverExe,
      args: [
        'C:/Users/ea_pyl/projects/syntax-visualizer/server/bin/Debug/netcoreapp3.1/SyntaxVisualizer.dll',
      ],
    },
    debug: {
      command: serverExe,
      args: [
        'C:/Users/ea_pyl/projects/syntax-visualizer/server/bin/Debug/netcoreapp3.1/SyntaxVisualizer.dll',
      ],
    },
  };

  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'csharp' }],
    progressOnInitialization: true,
    synchronize: {
      configurationSection: 'syntaxVisualizerCSharp',
    },
  };

  client = new LanguageClient(
    'syntaxVisualizerCSharp',
    'Syntax Visualizer C#',
    serverOptions,
    clientOptions
  );
  client.start();

  client.onReady().then(() => {
    const getTree = (params: any) =>
      client.sendRequest<any>('syntaxVisualizer/getSyntaxTree', params);

    const provider = new SyntaxNodeProvider(getTree);

    const tree = window.createTreeView('syntax-visualizer', {
      treeDataProvider: provider,
      showCollapseAll: true,
    });

    let incorrectTree = false;

    client.onNotification('syntaxVisualizer/invalidTree', () => {
      tree.message = 'Code was changed and saved - try to refresh.';
      incorrectTree = true;
    });

    client.onNotification('syntaxVisualizer/invalidTree2', () => {
      tree.message = 'Code was changed - try to save it and refresh.';
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

    commands.registerCommand('syntaxVisualizer.refreshEntry', () => {
      tree.message = null;
      incorrectTree = false;
      provider.refresh();
    });
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
