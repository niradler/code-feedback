using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace McpExample
{
    /// <summary>
    /// Represents a person with basic information
    /// </summary>
    public class Person
    {
        public string Name { get; set; }
        public int Age { get; set; }
        public string? Email { get; set; }

        public Person(string name, int age)
        {
            Name = name;
            Age = age;
        }

        public Person(string name, int age, string email) : this(name, age)
        {
            Email = email;
        }

        public string Greet()
        {
            return $"Hello, I'm {Name} and I'm {Age} years old";
        }

        public bool IsAdult()
        {
            return Age >= 18;
        }

        public override string ToString()
        {
            return $"Person {{ Name = {Name}, Age = {Age}, Email = {Email ?? "null"} }}";
        }

        public override bool Equals(object? obj)
        {
            if (obj is not Person other) return false;
            return Name == other.Name && Age == other.Age && Email == other.Email;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Name, Age, Email);
        }
    }

    /// <summary>
    /// Interface for greeting functionality
    /// </summary>
    public interface IGreeter
    {
        string Greet();
    }

    /// <summary>
    /// File processor for handling file operations
    /// </summary>
    public class FileProcessor
    {
        private readonly string _basePath;
        private readonly List<string> _processedFiles;

        public FileProcessor(string basePath = ".")
        {
            _basePath = basePath;
            _processedFiles = new List<string>();
        }

        /// <summary>
        /// Reads content from a file asynchronously
        /// </summary>
        /// <param name="filename">The name of the file to read</param>
        /// <returns>The file content as a string</returns>
        public async Task<string> ReadFileAsync(string filename)
        {
            var filePath = Path.Combine(_basePath, filename);
            var content = await File.ReadAllTextAsync(filePath);
            _processedFiles.Add(filename);
            return content;
        }

        /// <summary>
        /// Writes content to a file asynchronously
        /// </summary>
        /// <param name="filename">The name of the file to write</param>
        /// <param name="content">The content to write</param>
        public async Task WriteFileAsync(string filename, string content)
        {
            var filePath = Path.Combine(_basePath, filename);
            await File.WriteAllTextAsync(filePath, content);
            _processedFiles.Add(filename);
        }

        /// <summary>
        /// Gets processing statistics
        /// </summary>
        /// <returns>A dictionary containing processing statistics</returns>
        public Dictionary<string, object> GetStats()
        {
            return new Dictionary<string, object>
            {
                ["basePath"] = _basePath,
                ["processedFilesCount"] = _processedFiles.Count,
                ["files"] = _processedFiles.ToList()
            };
        }

        public IReadOnlyList<string> ProcessedFiles => _processedFiles.AsReadOnly();
    }

    /// <summary>
    /// Utility class for argument processing
    /// </summary>
    public static class ArgumentProcessor
    {
        /// <summary>
        /// Processes command line arguments
        /// </summary>
        /// <param name="args">The command line arguments</param>
        /// <returns>Processed arguments as a list</returns>
        public static List<string> ProcessArguments(string[] args)
        {
            return args
                .Where(arg => !string.IsNullOrWhiteSpace(arg))
                .Select(arg => arg.ToUpperInvariant())
                .ToList();
        }

        /// <summary>
        /// Parses key-value pairs from arguments
        /// </summary>
        /// <param name="args">Command line arguments in key=value format</param>
        /// <returns>Dictionary of key-value pairs</returns>
        public static Dictionary<string, string> ParseKeyValueArgs(string[] args)
        {
            return args
                .Where(arg => arg.Contains('='))
                .Select(arg => arg.Split('=', 2))
                .Where(parts => parts.Length == 2)
                .ToDictionary(
                    parts => parts[0].Trim(),
                    parts => parts[1].Trim()
                );
        }
    }

    /// <summary>
    /// Custom exception for demonstration
    /// </summary>
    public class ProcessingException : Exception
    {
        public ProcessingException(string message) : base(message) { }
        public ProcessingException(string message, Exception innerException) : base(message, innerException) { }
    }

    /// <summary>
    /// Extension methods for demonstration
    /// </summary>
    public static class Extensions
    {
        public static bool IsNullOrEmpty(this string? value)
        {
            return string.IsNullOrEmpty(value);
        }

        public static T[] ToArray<T>(this IEnumerable<T> source, int count)
        {
            return source.Take(count).ToArray();
        }
    }

    /// <summary>
    /// Main program class
    /// </summary>
    public class Program
    {
        public static async Task Main(string[] args)
        {
            try
            {
                Console.WriteLine("=== MCP Example C# Application ===");

                // Create a person
                var person = new Person("Alice Smith", 25, "alice@example.com");
                Console.WriteLine(person.Greet());
                Console.WriteLine($"Is adult: {person.IsAdult()}");
                Console.WriteLine($"Person details: {person}");

                // File processing example
                var processor = new FileProcessor();

                // Process command line arguments
                if (args.Length > 0)
                {
                    var processedArgs = ArgumentProcessor.ProcessArguments(args);
                    Console.WriteLine($"Processed arguments: [{string.Join(", ", processedArgs)}]");

                    var keyValueArgs = ArgumentProcessor.ParseKeyValueArgs(args);
                    if (keyValueArgs.Count > 0)
                    {
                        Console.WriteLine("Key-value arguments:");
                        foreach (var kvp in keyValueArgs)
                        {
                            Console.WriteLine($"  {kvp.Key} = {kvp.Value}");
                        }
                    }
                }

                // Display stats
                var stats = processor.GetStats();
                var statsJson = JsonConvert.SerializeObject(stats, Formatting.Indented);
                Console.WriteLine($"Processor stats: {statsJson}");

                // Demonstrate LINQ and async operations
                var people = new List<Person>
                {
                    new("John", 30),
                    new("Jane", 25),
                    new("Bob", 17),
                    new("Alice", 35, "alice2@example.com")
                };

                var adultNames = people
                    .Where(p => p.IsAdult())
                    .Select(p => p.Name)
                    .OrderBy(name => name)
                    .ToList();

                Console.WriteLine($"Adult names: [{string.Join(", ", adultNames)}]");

                // Calculate average age of adults
                var averageAge = people
                    .Where(p => p.IsAdult())
                    .Average(p => p.Age);

                Console.WriteLine($"Average age of adults: {averageAge:F2}");

                // Demonstrate async operations
                Console.WriteLine("\n=== Async Operations Demo ===");
                var tasks = new List<Task>
                {
                    DelayedMessage("First message", 1000),
                    DelayedMessage("Second message", 500),
                    DelayedMessage("Third message", 1500)
                };

                await Task.WhenAll(tasks);
                Console.WriteLine("All async operations completed!");

                // Pattern matching (C# 8+)
                Console.WriteLine("\n=== Pattern Matching Demo ===");
                foreach (var p in people)
                {
                    var category = p.Age switch
                    {
                        < 18 => "Minor",
                        >= 18 and < 65 => "Adult", 
                        >= 65 => "Senior",
                        _ => "Unknown"
                    };
                    Console.WriteLine($"{p.Name} is categorized as: {category}");
                }

            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error occurred: {ex.Message}");
                Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
                Environment.Exit(1);
            }
        }

        private static async Task DelayedMessage(string message, int delayMs)
        {
            await Task.Delay(delayMs);
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] {message}");
        }
    }
}
