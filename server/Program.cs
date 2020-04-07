using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using OmniSharp.Extensions.LanguageServer;
using OmniSharp.Extensions.LanguageServer.Protocol;
using OmniSharp.Extensions.LanguageServer.Protocol.Client;
using OmniSharp.Extensions.LanguageServer.Protocol.Client.Capabilities;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Protocol.Server.Capabilities;
using OmniSharp.Extensions.LanguageServer.Server;
using Serilog;
using ILanguageServer = OmniSharp.Extensions.LanguageServer.Server.ILanguageServer;

namespace SyntaxVisualizer
{
    class Program
    {
        static void Main(string[] args)
        {
            MainAsync(args).Wait();
        }

        static async Task MainAsync(string[] args)
        {
            Log.Logger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .WriteTo.File("log.txt", rollingInterval: RollingInterval.Day)
                .MinimumLevel.Verbose()
              .CreateLogger();

            Log.Logger.Information("This only goes file...");
            var walker = new CustomWalker();
            var text = string.Empty;

            var server = await LanguageServer.From(options =>
                options
                    .WithInput(Console.OpenStandardInput())
                    .WithOutput(Console.OpenStandardOutput())
                    .ConfigureLogging(x => x
                        .AddSerilog()
                        .AddLanguageServer()
                        .SetMinimumLevel(LogLevel.Debug))
                    .WithHandler<SyntaxTreeHandler>()
                    .OnDidSaveTextDocument((p, t) =>
                    {
                        //var tree = CSharpSyntaxTree.ParseText(p.Text);
                        //walker.Visit(await tree.GetRootAsync());
                        text = p.Text;
                        return Unit.Task;
                    },
                    new TextDocumentSaveRegistrationOptions
                    {
                        IncludeText = true,
                        DocumentSelector = new DocumentSelector(
                            new DocumentFilter
                            {
                                Pattern = "**/*.cs"
                            }
                        )
                    })
            );

            //server.AddHandler("getSyntaxTree", new MyHandler());

            await server.WaitForExit;
        }

        public class CustomWalker : CSharpSyntaxWalker
        {
            static int Tabs = 0;
            public override void Visit(SyntaxNode node)
            {
                Tabs++;
                var indents = new string('\t', Tabs);
                Console.WriteLine(indents + node.Kind());
                base.Visit(node);
                Tabs--;
            }
        }
    }
}
