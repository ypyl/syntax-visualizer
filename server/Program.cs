using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using OmniSharp.Extensions.LanguageServer.Protocol.Models;
using OmniSharp.Extensions.LanguageServer.Protocol.Server;
using OmniSharp.Extensions.LanguageServer.Server;
using Serilog;

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

            var handler = new SyntaxTreeHandler();

            var server = await LanguageServer.From(options =>
                options
                    .WithInput(Console.OpenStandardInput())
                    .WithOutput(Console.OpenStandardOutput())
                    .ConfigureLogging(x => x
                        .AddSerilog()
                        .AddLanguageServer()
                        .SetMinimumLevel(LogLevel.Debug))
                    .WithHandler(handler)
                    .WithHandler(new TextDocumentHandler(handler)));

            handler.UpdateInvalidateTree(() => server.SendNotification("syntaxVisualizer/invalidTree"));

            await server.WaitForExit;
        }
    }
}
