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
    /// <summary>
    /// Handles text document synchronization for C# files.
    /// </summary>
    internal class CSharpTextDocumentHandler : ITextDocumentSyncHandler
    {
        // Defines a document selector for C# files.
        private readonly DocumentSelector _documentSelector = new(
            new DocumentFilter
            {
                Pattern = "**/*.cs"
            }
        );
        // Reference to the SyntaxTreeHandler for updating and handling syntax trees.
        private readonly SyntaxTreeHandler _handler;
        // Capability for text document synchronization.
        private SynchronizationCapability _capability;

        /// <summary>
        /// Constructor that takes a SyntaxTreeHandler as a parameter.
        /// </summary>
        /// <param name="handler"></param>
        public CSharpTextDocumentHandler(SyntaxTreeHandler handler) => _handler = handler;

        /// <summary>
        /// Handles the event when a text document has changed.
        /// </summary>
        /// <param name="notification"></param>
        /// <param name="token"></param>
        /// <returns></returns>
        public Task<Unit> Handle(DidChangeTextDocumentParams notification, CancellationToken token)
        {
            return Unit.Task;
        }

        /// <summary>
        /// Gets the registration options for text document change events.
        /// </summary>
        /// <returns></returns>
        TextDocumentChangeRegistrationOptions IRegistration<TextDocumentChangeRegistrationOptions>.GetRegistrationOptions() =>
            new()
            {
                DocumentSelector = _documentSelector,
                SyncKind = TextDocumentSyncKind.Incremental
            };

        /// <summary>
        /// Sets the capability for text document synchronization.
        /// </summary>
        /// <param name="capability"></param>
        public void SetCapability(SynchronizationCapability capability) => _capability = capability;

        /// <summary>
        /// Handles the event when a text document is opened.
        /// </summary>
        /// <param name="notification"></param>
        /// <param name="token"></param>
        /// <returns></returns>
        public Task<Unit> Handle(DidOpenTextDocumentParams notification, CancellationToken token)
        {
            // Update the current code in the SyntaxTreeHandler when a document is opened.
            _handler.UpdateCurrentCode(notification.TextDocument.Text);
            return Task.FromResult(Unit.Value);
        }

        /// <summary>
        /// Gets the registration options for text document open events.
        /// </summary>
        /// <returns></returns>
        TextDocumentRegistrationOptions IRegistration<TextDocumentRegistrationOptions>.GetRegistrationOptions() =>
            new()
            {
                DocumentSelector = _documentSelector,
            };

        /// <summary>
        /// Handles the event when a text document is closed.
        /// </summary>
        /// <param name="notification"></param>
        /// <param name="token"></param>
        /// <returns></returns>
        public Task<Unit> Handle(DidCloseTextDocumentParams notification, CancellationToken token) => Unit.Task;

        /// <summary>
        /// Handles the event when a text document is saved.
        /// </summary>
        /// <param name="notification"></param>
        /// <param name="token"></param>
        /// <returns></returns>
        public Task<Unit> Handle(DidSaveTextDocumentParams notification, CancellationToken token)
        {
            _handler.UpdateCurrentCode(notification.Text);
            return Unit.Task;
        }

        /// <summary>
        /// Gets the registration options for text document save events.
        /// </summary>
        /// <returns></returns>
        TextDocumentSaveRegistrationOptions IRegistration<TextDocumentSaveRegistrationOptions>.GetRegistrationOptions() =>
            new()
            {
                DocumentSelector = _documentSelector,
                IncludeText = true
            };

        /// <summary>
        /// Gets the attributes of a text document based on its URI.
        /// </summary>
        /// <param name="uri"></param>
        /// <returns></returns>
        public TextDocumentAttributes GetTextDocumentAttributes(Uri uri) => new(uri, "csharp");
    }
}
