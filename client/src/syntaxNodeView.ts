import * as vscode from 'vscode';

export class SyntaxNodeProvider
  implements vscode.TreeDataProvider<SyntaxNodeTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    SyntaxNodeTreeItem | undefined
  > = new vscode.EventEmitter<SyntaxNodeTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<
    SyntaxNodeTreeItem | undefined
  > = this._onDidChangeTreeData.event;

  constructor(private getTree: (params: any) => Promise<any>) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SyntaxNodeTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SyntaxNodeTreeItem): Thenable<SyntaxNodeTreeItem[]> {
    if (element) {
      return this.getTree({ id: element.id }).then((x: SyntaxNode) => {
        if (x && x.nodes) {
          return x.nodes.map((n) => this.getNode(n));
        }
        return null;
      });
    } else {
      return this.getTree(null).then((x: SyntaxNode) => {
        if (x && x.nodes) {
          return x.nodes.map((n) => this.getNode(n));
        }
        return null;
      });
    }
  }

  private getNode(node: SyntaxNode): SyntaxNodeTreeItem {
    if (node.nodes && node.nodes.length > 0) {
      return new SyntaxNodeTreeItem(
        node.id,
        node.type,
        node.kind,
        vscode.TreeItemCollapsibleState.Collapsed
      );
    } else {
      return new SyntaxNodeTreeItem(
        node.id,
        node.type,
        node.kind,
        vscode.TreeItemCollapsibleState.None
      );
    }
  }
}

class SyntaxNode {
  id: string;
  kind: string;
  type: string;

  nodes: SyntaxNode[];
}

class SyntaxNodeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    private kind: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.kind}`;
  }

  get description(): string {
    return this.kind;
  }
}
