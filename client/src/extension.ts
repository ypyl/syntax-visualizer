'use strict';

import { workspace, Disposable, ExtensionContext, commands } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient';
import { Trace } from 'vscode-jsonrpc';
import { TestView } from './testView';

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
    // progressOnInitialization: true,
    // synchronize: {
    //   configurationSection: 'syntaxVisualizerCSharp',
    //   fileEvents: workspace.createFileSystemWatcher('**/*.cs'),
    // },
  };

  client = new LanguageClient(
    'syntaxVisualizerCSharp',
    'Syntax Visualizer C#',
    serverOptions,
    clientOptions
  );
  client.registerProposedFeatures();
  client.trace = Trace.Verbose;
  client.start();

  client.onReady().then(() => {
    new TestView(context, () => {
      client
        .sendRequest<any>('syntaxVisualizer/getSyntaxTree', {
          test: 'value',
        })
        .then((x) => {
          console.log(x);
        })
        .catch((e) => {
          console.log(e);
        });
    });
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
