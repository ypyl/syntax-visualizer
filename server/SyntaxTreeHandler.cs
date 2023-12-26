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
    /// <summary>
    /// Represents the parameters for a request to get the syntax tree.
    /// </summary>
    public class STreeParams : IRequest<SNode>
    {
        public string text;
    }

    /// <summary>
    /// Represents a node in the syntax tree.
    /// </summary>
    public class SNode
    {
        public string Id;
        public string Type;
        public string Kind;
        public string FullSpan;
        public string ValueText;
        public int LineStart;
        public int LineEnd;
        public int ColumnStart;
        public int ColumnEnd;
        public List<SNode> nodes;
    }

    /// <summary>
    /// Interface for handling syntax tree requests.
    /// </summary>
    [Parallel, Method("syntaxVisualizer/getSyntaxTree")]
    interface ISyntaxTreeHandler : IJsonRpcHandler, IJsonRpcRequestHandler<STreeParams, SNode>
    {

    }

    /// <summary>
    /// Implementation of the syntax tree handler.
    /// </summary>
    public class SyntaxTreeHandler : ISyntaxTreeHandler
    {
        // SyntaxWalker for traversing the syntax tree.
        private readonly SyntaxWalker walker = new();

        /// <summary>
        /// SyntaxWalker for traversing the syntax tree and building the SNode structure.
        /// </summary>
        public class SyntaxWalker : CSharpSyntaxWalker
        {
            private int id;
            private SNode current;
            public SNode SNode { get; private set; }

            /// <summary>
            /// Resets the SyntaxWalker state.
            /// </summary>
            public void Reset()
            {
                SNode = null;
                current = SNode;
            }

            /// <summary>
            /// Constructor for the SyntaxWalker.
            /// </summary>
            public SyntaxWalker() : base(SyntaxWalkerDepth.Token)
            {
            }

            /// <summary>
            /// Visits a syntax node and creates an <see cref="SNode"> for it.
            /// </summary>
            /// <param name="node"></param>
            public override void Visit(SyntaxNode node)
            {
                var location = node.GetLocation().GetLineSpan();
                var n = new SNode
                {
                    Id = id.ToString(),
                    Kind = node.Kind().ToString(),
                    Type = node.GetType().Name,
                    FullSpan = node.FullSpan.ToString(),
                    ValueText = node.GetText().ToString(),
                    ColumnStart = location.Span.Start.Character,
                    ColumnEnd = location.Span.End.Character,
                    LineStart = location.Span.Start.Line,
                    LineEnd = location.Span.End.Line
                };
                id++;
                if (SNode is null)
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

            /// <summary>
            /// Visits a syntax token and creates an <see cref="SNode"> for it.
            /// </summary>
            /// <param name="token"></param>
            public override void VisitToken(SyntaxToken token)
            {
                current.nodes ??= new List<SNode>();
                var location = token.GetLocation().GetLineSpan();
                var n = new SNode
                {
                    Id = id.ToString(),
                    Kind = token.Kind().ToString(),
                    Type = token.GetType().Name,
                    FullSpan = token.FullSpan.ToString(),
                    ValueText = token.ValueText,
                    ColumnStart = location.Span.Start.Character,
                    ColumnEnd = location.Span.End.Character,
                    LineStart = location.Span.Start.Line,
                    LineEnd = location.Span.End.Line
                };
                id++;
                current.nodes.Add(n);
                var previos = current;
                current = n;
                base.VisitToken(token);
                current = previos;
            }
        }

        /// <summary>
        /// Updates the current code and builds the syntax tree.
        /// </summary>
        /// <param name="code"></param>
        public void UpdateCurrentCode(string code)
        {
            var tree = CSharpSyntaxTree.ParseText(code);
            walker.Reset();
            walker.Visit(tree.GetRoot());
        }

        /// <summary>
        /// Handles the syntax tree request.
        /// </summary>
        /// <param name="request"></param>
        /// <param name="cancellationToken"></param>
        /// <returns></returns>
        public Task<SNode> Handle(STreeParams request, CancellationToken cancellationToken)
        {
            if (request?.text is not null)
            {
                UpdateCurrentCode(request.text);
            }
            return Task.FromResult(request?.text is null ? null : walker.SNode);
        }

        /// <summary>
        /// Finds a subtree with the specified id in the syntax tree.
        /// </summary>
        /// <param name="id"></param>
        /// <param name="node"></param>
        /// <returns></returns>
        private SNode FindSubTree(string id, SNode node)
        {
            if (node.nodes is null)
            {
                return null;
            }
            var n = node.nodes.FirstOrDefault(x => x.Id == id);
            if (n is null)
            {
                foreach (var subNote in node.nodes)
                {
                    var t = FindSubTree(id, subNote);
                    if (t is not null)
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
