import * as vscode from 'vscode';

export class TestView {
  constructor(context: vscode.ExtensionContext, call: any) {
    const view = vscode.window.createTreeView('syntax-visualizer', {
      treeDataProvider: aNodeWithIdTreeDataProvider(),
      showCollapseAll: true,
    });
    vscode.commands.registerCommand('syntaxVisualizer.refreshEntry', () =>
      call()
    );
  }
}

const tree = {
  a: {
    aa: {
      aaa: {
        aaaa: {
          aaaaa: {
            aaaaaa: {},
          },
        },
      },
    },
    ab: {},
  },
  b: {
    ba: {},
    bb: {},
  },
};
let nodes = {};

function aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{
  key: string;
}> {
  return {
    getChildren: (element: { key: string }): { key: string }[] => {
      return getChildren(element ? element.key : undefined).map((key) =>
        getNode(key)
      );
    },
    getTreeItem: (element: { key: string }): vscode.TreeItem => {
      const treeItem = getTreeItem(element.key);
      treeItem.id = element.key;
      return treeItem;
    },
    getParent: ({ key }: { key: string }): { key: string } => {
      const parentKey = key.substring(0, key.length - 1);
      return parentKey ? new Key(parentKey) : void 0;
    },
  };
}

function getChildren(key: string): string[] {
  if (!key) {
    return Object.keys(tree);
  }
  let treeElement = getTreeElement(key);
  if (treeElement) {
    return Object.keys(treeElement);
  }
  return [];
}

function getTreeItem(key: string): vscode.TreeItem {
  const treeElement = getTreeElement(key);
  return {
    label: key,
    tooltip: `Tooltip for ${key}`,
    collapsibleState:
      treeElement && Object.keys(treeElement).length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
  };
}

function getTreeElement(element): any {
  let parent = tree;
  for (let i = 0; i < element.length; i++) {
    parent = parent[element.substring(0, i + 1)];
    if (!parent) {
      return null;
    }
  }
  return parent;
}

function getNode(key: string): { key: string } {
  if (!nodes[key]) {
    nodes[key] = new Key(key);
  }
  return nodes[key];
}

class Key {
  constructor(readonly key: string) {}
}
