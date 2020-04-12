using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Protocol.Server.Capabilities;

namespace SyntaxVisualizer
{
    internal class TextDocumentHandler : ITextDocumentSyncHandler
    {
        private readonly DocumentSelector _documentSelector = new DocumentSelector(
            new DocumentFilter
            {
                Pattern = "**/*.cs"
            }
        );
        private readonly SyntaxTreeHandler _handler;
        private SynchronizationCapability _capability;

        public TextDocumentHandler(SyntaxTreeHandler handler) => _handler = handler;

        public Task<Unit> Handle(DidChangeTextDocumentParams notification, CancellationToken token)
        {
            _handler.invalidateTree2();
            return Unit.Task;
        }

        TextDocumentChangeRegistrationOptions IRegistration<TextDocumentChangeRegistrationOptions>.GetRegistrationOptions() =>
            new TextDocumentChangeRegistrationOptions()
            {
                DocumentSelector = _documentSelector,
                SyncKind = TextDocumentSyncKind.Incremental
            };

        public void SetCapability(SynchronizationCapability capability) => _capability = capability;

        public async Task<Unit> Handle(DidOpenTextDocumentParams notification, CancellationToken token)
        {
            _handler.UpdateCurrentCode(notification.TextDocument.Text);
            return Unit.Value;
        }

        TextDocumentRegistrationOptions IRegistration<TextDocumentRegistrationOptions>.GetRegistrationOptions() =>
            new TextDocumentRegistrationOptions
            {
                DocumentSelector = _documentSelector,
            };

        public Task<Unit> Handle(DidCloseTextDocumentParams notification, CancellationToken token) => Unit.Task;

        public Task<Unit> Handle(DidSaveTextDocumentParams notification, CancellationToken token)
        {
            _handler.UpdateCurrentCode(notification.Text);
            return Unit.Task;
        }

        TextDocumentSaveRegistrationOptions IRegistration<TextDocumentSaveRegistrationOptions>.GetRegistrationOptions() =>
            new TextDocumentSaveRegistrationOptions()
            {
                DocumentSelector = _documentSelector,
                IncludeText = true
            };

        public TextDocumentAttributes GetTextDocumentAttributes(Uri uri) => new TextDocumentAttributes(uri, "csharp");
    }
}
