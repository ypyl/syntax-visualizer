using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Newtonsoft.Json.Linq;
using OmniSharp.Extensions.JsonRpc;
using OmniSharp.Extensions.JsonRpc.Server;
using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Server;

namespace SyntaxVisualizer
{
    public class SyntaxTreeParams : IRequest<SyntaxTree>
    {
        public string test;
    }

    public class SyntaxTree
    {
        //public string value;

    }
    public class SyntaxTreeRegistration
    {

    }

    public class SyntaxTreeCapability
    {

    }

    [Parallel, Method("syntaxVisualizer/getSyntaxTree")]
    interface ISyntaxTreeHandler
        : IJsonRpcHandler,
            IJsonRpcRequestHandler<SyntaxTreeParams, SyntaxTree>,
            IRegistration<SyntaxTreeRegistration>,
            ICapability<SyntaxTreeCapability>
    {

    }

    public class SyntaxTreeHandler : ISyntaxTreeHandler
    {
        public SyntaxTreeRegistration GetRegistrationOptions()
        {
            return new SyntaxTreeRegistration();
        }

        public Task<SyntaxTree> Handle(SyntaxTreeParams request, CancellationToken cancellationToken)
        {
            Console.Write(request.test);
            return Task.FromResult(new SyntaxTree { });
        }

        public void SetCapability(SyntaxTreeCapability capability)
        {
        }
    }
}
