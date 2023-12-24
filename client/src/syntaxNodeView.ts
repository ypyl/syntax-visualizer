// Import the necessary module from vscode
import * as vscode from "vscode";

// Define the SyntaxNodeProvider class that implements TreeDataProvider for the syntax tree
export class SyntaxNodeProvider
  implements vscode.TreeDataProvider<SyntaxNodeTreeItem>
{
  // Method to get SyntaxNodeTreeItems based on a given position range
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

  // Recursive method to search for SyntaxNodeTreeItems within a given position range
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
        if (subNode.lineStart <= startLine && subNode.lineEnd >= endLine) {
          if (subNode.lineStart == startLine && subNode.columnStart > start) {
            continue;
          }
          if (subNode.lineEnd == endLine && subNode.columnEnd < end) {
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

  // Event emitter for tree data changes
  private _onDidChangeTreeData: vscode.EventEmitter<
    SyntaxNodeTreeItem | undefined
  > = new vscode.EventEmitter<SyntaxNodeTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SyntaxNodeTreeItem | undefined> =
    this._onDidChangeTreeData.event;

  // Constructor for SyntaxNodeProvider, taking a function to get the syntax tree
  constructor(private getTree: (params: any) => Promise<any>) {}

  // Variable to store the syntax tree
  public fillTree?: SyntaxNode;

  // Method to refresh the tree
  refresh(): void {
    this.fillTree = undefined;
    if (this._onDidChangeTreeData) {
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  // Get the tree item for a given element
  getTreeItem(element: SyntaxNodeTreeItem): vscode.TreeItem {
    return element;
  }

  // Get the parent of a tree item
  getParent(
    element: SyntaxNodeTreeItem
  ): vscode.ProviderResult<SyntaxNodeTreeItem> {
    if (!this.fillTree) {
      return undefined;
    }
    return this.findParent(this.fillTree, element.id);
  }

  // Find the parent of a tree node by ID
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

  // Get a syntax node by its ID
  getNodeById(elementId: string): SyntaxNode | undefined {
    if (!this.fillTree) {
      return undefined;
    }
    return this.findNode(this.fillTree, elementId);
  }

  // Recursive method to find a syntax node by ID
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

  // Get the children of a tree item
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

  // Update the tree by adding item objects
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

  // Get the nodes of a tree item
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

  // Get the subtree of a tree item
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

  // Create a SyntaxNodeTreeItem from a SyntaxNode
  private getNode(node: SyntaxNode): SyntaxNodeTreeItem {
    return new SyntaxNodeTreeItem(
      node.id,
      node.kind,
      node.type,
      node.fullSpan ?? node.valueText,
      node.nodes && node.nodes.length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
  }
}

// Define the SyntaxNode class to represent a node in the syntax tree
class SyntaxNode {
  id!: string;
  kind!: string;
  type!: string;
  fullSpan!: string;
  valueText!: string;
  columnStart!: number;
  columnEnd!: number;
  lineStart!: number;
  lineEnd!: number;

  nodes!: SyntaxNode[];

  item!: SyntaxNodeTreeItem;
}

// Define the SyntaxNodeTreeItem class, extending vscode.TreeItem
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

  // Tooltip for the tree item
  public tooltip: string = this.info;

  // Description for the tree item
  public description: string = this.type;
}
