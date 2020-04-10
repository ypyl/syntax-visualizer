'use strict';

import {
  workspace,
  Disposable,
  ExtensionContext,
  commands,
  window,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient';
import { Trace } from 'vscode-jsonrpc';
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
      fileEvents: workspace.createFileSystemWatcher('**/*.cs'),
    },
  };

  client = new LanguageClient(
    'syntaxVisualizerCSharp',
    'Syntax Visualizer C#',
    serverOptions,
    clientOptions
  );
  client.trace = Trace.Verbose;
  client.start();

  client.onReady().then(() => {
    const getTree = (params: any) =>
      client.sendRequest<any>('syntaxVisualizer/getSyntaxTree', params);
    const provider = new SyntaxNodeProvider(getTree);

    client.onRequest('syntaxVisualizer/revealSyntaxNode', (params) => {
      console.log('client called');
    });

    const tree = window.createTreeView('syntax-visualizer', {
      treeDataProvider: provider,
      showCollapseAll: true,
    });
    commands.registerCommand('syntaxVisualizer.refreshEntry', () =>
      provider.refresh()
    );

    tree.visible;
    tree.reveal();
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
