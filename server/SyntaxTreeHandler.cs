using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using OmniSharp.Extensions.JsonRpc;

namespace SyntaxVisualizer
{
    public class STreeParams : IRequest<SNode>
    {
        public string id;
    }

    public class SNode
    {
        public string id;
        public string type;
        public string kind;
        public string info;
        public int startLine;
        public int endLine;
        public int start;
        public int end;
        public List<SNode> nodes;
    }

    [Parallel, Method("syntaxVisualizer/getSyntaxTree")]
    interface ISyntaxTreeHandler : IJsonRpcHandler, IJsonRpcRequestHandler<STreeParams, SNode>
    {

    }

    public class SyntaxTreeHandler : ISyntaxTreeHandler
    {
        private readonly SyntaxWalker walker = new SyntaxWalker();
        public Action invalidateTree = () => { };
        public Action invalidateTree2 = () => { };

        public void UpdateInvalidateTree(Action action)
        {
            invalidateTree = action;
        }

        public void UpdateInvalidateTree2(Action action)
        {
            invalidateTree2 = action;
        }

        public class SyntaxWalker : CSharpSyntaxWalker
        {
            private int id;
            private SNode current;
            public SNode SNode { get; private set; }

            public void Reset()
            {
                SNode = null;
                current = SNode;
            }

            public SyntaxWalker() : base(SyntaxWalkerDepth.Token)
            {
            }

            public override void Visit(SyntaxNode node)
            {
                var location = node.GetLocation().GetLineSpan();
                var n = new SNode
                {
                    id = id.ToString(),
                    kind = node.Kind().ToString(),
                    type = node.GetType().Name,
                    info = node.FullSpan.ToString(),
                    start = location.Span.Start.Character,
                    end = location.Span.End.Character,
                    startLine = location.Span.Start.Line,
                    endLine = location.Span.End.Line
                };
                id++;
                if (SNode == null)
                {
                    SNode = n;
                }
                else
                {
                    current.nodes ??= new List<SNode>();
                    current.nodes.Add(n);
                }
                var previos = current;
                current = n;
                base.Visit(node);
                current = previos;
            }

            public override void VisitToken(SyntaxToken token)
            {
                current.nodes ??= new List<SNode>();
                var location = token.GetLocation().GetLineSpan();
                var n = new SNode
                {
                    id = id.ToString(),
                    kind = token.Kind().ToString(),
                    type = token.GetType().Name,
                    info = token.ValueText,
                    start = location.Span.Start.Character,
                    end = location.Span.End.Character,
                    startLine = location.Span.Start.Line,
                    endLine = location.Span.End.Line
                };
                id++;
                current.nodes.Add(n);
                var previos = current;
                current = n;
                base.VisitToken(token);
                current = previos;
            }
        }

        public void UpdateCurrentCode(string code)
        {
            var tree = CSharpSyntaxTree.ParseText(code);
            if (walker.SNode != null)
            {
                invalidateTree();
            }
            walker.Reset();
            walker.Visit(tree.GetRoot());
        }

        public async Task<SNode> Handle(STreeParams request, CancellationToken cancellationToken)
        {
            if (request?.id == null)
            {
                return walker.SNode;
            }
            else
            {
                return FindSubTree(request.id, walker.SNode);
            }
        }

        private SNode FindSubTree(string id, SNode node)
        {
            if (node.nodes == null)
            {
                return null;
            }
            var n = node.nodes.FirstOrDefault(x => x.id == id);
            if (n == null)
            {
                foreach (var subNote in node.nodes)
                {
                    var t = FindSubTree(id, subNote);
                    if (t != null)
                    {
                        return t;
                    }
                }
                return null;
            }
            else
            {
                return n;
            }
        }
    }
}
