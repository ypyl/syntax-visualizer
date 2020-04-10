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
        public List<SNode> nodes;

    }

    [Parallel, Method("syntaxVisualizer/getSyntaxTree")]
    interface ISyntaxTreeHandler : IJsonRpcHandler, IJsonRpcRequestHandler<STreeParams, SNode>
    {

    }

    public class SyntaxTreeHandler : ISyntaxTreeHandler
    {
        private SyntaxWalker walker = new SyntaxWalker();

        public class SyntaxWalker : CSharpSyntaxWalker
        {
            private SNode current;
            public SNode SNode { get; private set; } = new SNode();

            public void Reset()
            {
                SNode = new SNode();
                current = SNode;
            }

            public override void Visit(SyntaxNode node)
            {
                current.nodes ??= new List<SNode>();
                var n = new SNode
                {
                    id = node.FullSpan.ToString(),
                    kind = node.Kind().ToString(),
                    type = node.GetType().Name
                };
                current.nodes.Add(n);
                var previos = current;
                current = n;
                base.Visit(node);
                current = previos;
            }
        }
        public void UpdateCurrentCode(string code)
        {
            var tree = CSharpSyntaxTree.ParseText(code);
            walker.Reset();
            walker.Visit(tree.GetRoot());
        }

        public Task<SNode> Handle(STreeParams request, CancellationToken cancellationToken)
        {
            if (request?.id == null)
            {
                return Task.FromResult(walker.SNode);
            }
            else
            {
                return Task.FromResult(FindSubTree(request.id, walker.SNode));
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
