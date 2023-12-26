using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using OmniSharp.Extensions.LanguageServer.Server;
using Serilog;

namespace SyntaxVisualizer
{
    class Program
    {
        static async Task Main(string[] args)
        {
            // Configure Serilog as the logging provider
            Log.Logger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .WriteTo.File("log.txt", rollingInterval: RollingInterval.Day)
                .MinimumLevel.Error()
              .CreateLogger();

             // Create an instance of SyntaxTreeHandler to handle syntax tree-related operations
            var handler = new SyntaxTreeHandler();

            // Create a Language Server instance
            var server = await LanguageServer.From(options =>
                options
                    // Set the input and output streams for communication with the language server
                    .WithInput(Console.OpenStandardInput())
                    .WithOutput(Console.OpenStandardOutput())
                    // Configure logging with Serilog and set the minimum log level to Error
                    .ConfigureLogging(x => x.AddSerilog()
                        .AddLanguageServer()
                        .SetMinimumLevel(LogLevel.Error))
                    // Register the SyntaxTreeHandler and TextDocumentHandler with the server
                    .WithHandler(handler));

            // Wait for the server to exit
            await server.WaitForExit;
        }
    }
}
