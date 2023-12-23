import * as vscode from "vscode";

export class SyntaxNodeProvider
  implements vscode.TreeDataProvider<SyntaxNodeTreeItem>
{
  getNodeItemByPosition(
    start: vscode.Position,
    end: vscode.Position
  ): SyntaxNodeTreeItem[] {
    if (!this.fillTree) {
      return [];
    }
    return this.searchNodeByPosition(
      this.fillTree,
      start.line,
      start.character,
      end.line,
      end.character
    );
  }

  private searchNodeByPosition(
    tree: SyntaxNode,
    startLine: number,
    start: number,
    endLine: number,
    end: number
  ): SyntaxNodeTreeItem[] {
    let result: SyntaxNodeTreeItem[] = [];
    if (tree.nodes) {
      for (let i = 0; i < tree.nodes.length; i++) {
        let subNode = tree.nodes[i];
        if (subNode.startLine <= startLine && subNode.endLine >= endLine) {
          if (subNode.startLine == startLine && subNode.start > start) {
            continue;
          }
          if (subNode.endLine == endLine && subNode.end < end) {
            continue;
          }
          result.push(subNode.item);
          const inner = this.searchNodeByPosition(
            subNode,
            startLine,
            start,
            endLine,
            end
          );
          if (inner) {
            result = result.concat(inner);
          }
          break;
        }
      }
    }
    return result;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    SyntaxNodeTreeItem | undefined
  > = new vscode.EventEmitter<SyntaxNodeTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SyntaxNodeTreeItem | undefined> =
    this._onDidChangeTreeData.event;

  constructor(private getTree: (params: any) => Promise<any>) {}

  public fillTree?: SyntaxNode;

  refresh(): void {
    this.fillTree = undefined;
    if (this._onDidChangeTreeData) {
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  getTreeItem(element: SyntaxNodeTreeItem): vscode.TreeItem {
    return element;
  }

  getParent(
    element: SyntaxNodeTreeItem
  ): vscode.ProviderResult<SyntaxNodeTreeItem> {
    if (!this.fillTree) {
      return undefined;
    }
    return this.findParent(this.fillTree, element.id);
  }

  findParent(tree: SyntaxNode, id: string): SyntaxNodeTreeItem | undefined {
    if (tree.nodes.some((x) => x.id === id)) {
      return tree.item;
    } else {
      for (let i = 0; i < tree.nodes.length; i++) {
        const subResult = this.findParent(tree.nodes[i], id);
        if (subResult) {
          return subResult;
        }
      }
    }
  }

  getNodeById(elementId: string): SyntaxNode | undefined {
    if (!this.fillTree) {
      return undefined;
    }
    return this.findNode(this.fillTree, elementId);
  }

  findNode(tree: SyntaxNode, id: string): SyntaxNode | undefined {
    if (tree.id === id) {
      return tree;
    } else if (tree.nodes) {
      for (let i = 0; i < tree.nodes.length; i++) {
        const subResult = this.findNode(tree.nodes[i], id);
        if (subResult) {
          return subResult;
        }
      }
    }
  }

  getChildren(
    element?: SyntaxNodeTreeItem
  ): vscode.ProviderResult<SyntaxNodeTreeItem[]> {
    if (this.fillTree == null) {
      return this.getTree(null).then((x: SyntaxNode) => {
        if (!!x && !!x.nodes && x.nodes.length == 1) {
          this.fillTree = x.nodes[0];
        } else {
          this.fillTree = x;
        }
        this.updateTree(this.fillTree);
        return this.getNodes(this.fillTree, element);
      });
    } else {
      return this.getNodes(this.fillTree, element);
    }
  }

  private updateTree(tree: SyntaxNode) {
    if (!tree) {
      return;
    }
    if (tree.item == null) {
      tree.item = this.getNode(tree);
    }
    if (tree.nodes) {
      for (let i = 0; i < tree.nodes.length; i++) {
        this.updateTree(tree.nodes[i]);
      }
    }
  }

  private getNodes(
    tree: SyntaxNode,
    element?: SyntaxNodeTreeItem
  ): SyntaxNodeTreeItem[] {
    if (!tree || !tree.nodes) {
      return [];
    }
    if (element) {
      const s = this.getSubNote(tree, element.id);
      if (s && s.nodes) {
        return s.nodes.map((n) => n.item);
      }
      return [];
    } else {
      return tree.nodes.map((n) => n.item);
    }
  }

  private getSubNote(tree: SyntaxNode, id: string): SyntaxNode | undefined {
    if (!tree || !tree.nodes) {
      return undefined;
    }
    const first = tree.nodes.find((x) => x.id === id);
    if (first) {
      return first;
    } else {
      for (let i = 0; i < tree.nodes.length; i++) {
        const findInSub = this.getSubNote(tree.nodes[i], id);
        if (findInSub) {
          return findInSub;
        }
      }
      return undefined;
    }
  }

  private getNode(node: SyntaxNode): SyntaxNodeTreeItem {
    return node.nodes && node.nodes.length > 0
      ? new SyntaxNodeTreeItem(
          node.id,
          node.kind,
          node.type,
          node.info,
          vscode.TreeItemCollapsibleState.Collapsed
        )
      : new SyntaxNodeTreeItem(
          node.id,
          node.kind,
          node.type,
          node.info,
          vscode.TreeItemCollapsibleState.None
        );
  }
}

class SyntaxNode {
  id!: string;
  kind!: string;
  type!: string;
  info!: string;
  start!: number;
  end!: number;
  startLine!: number;
  endLine!: number;

  nodes!: SyntaxNode[];

  item!: SyntaxNodeTreeItem;
}

class SyntaxNodeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly id: string,
    public readonly label: string,
    private type: string,
    private info: string,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  public tooltip: string = this.info;

  public description: string = this.type;
}
