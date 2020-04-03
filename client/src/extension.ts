'use strict';

import { workspace, Disposable, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient';
import { Trace } from 'vscode-jsonrpc';

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
    documentSelector: [
      {
        pattern: '**/*.cs',
      },
    ],
    progressOnInitialization: true,
    synchronize: {
      configurationSection: 'syntaxVisualizerCSharp',
      fileEvents: workspace.createFileSystemWatcher('**/*.cs'),
    },
  };

  const client = new LanguageClient(
    'syntaxVisualizerCSharp',
    'Syntax Visualizer C#',
    serverOptions,
    clientOptions
  );
  client.registerProposedFeatures();
  client.trace = Trace.Verbose;
  let disposable = client.start();

  context.subscriptions.push(disposable);
}
