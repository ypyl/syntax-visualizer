using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
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
                .MinimumLevel.Error()
              .CreateLogger();

            Log.Logger.Information("This only goes file...");

            var handler = new SyntaxTreeHandler();

            var server = await LanguageServer.From(options =>
                options
                    .WithInput(Console.OpenStandardInput())
                    .WithOutput(Console.OpenStandardOutput())
                    .ConfigureLogging(x => x.AddSerilog()
                        .AddLanguageServer()
                        .SetMinimumLevel(LogLevel.Error))
                    .WithHandler(handler)
                    .WithHandler(new TextDocumentHandler(handler)));

            handler.UpdateInvalidateTree(() => server.SendNotification("syntaxVisualizer/invalidTree"));
            handler.UpdateInvalidateTree2(() => server.SendNotification("syntaxVisualizer/invalidTree2"));

            await server.WaitForExit;
        }
    }
}
