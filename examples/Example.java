package com.example;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Example Java class demonstrating various language features for MCP testing.
 */
public class Example {
    
    /**
     * Represents a person with basic information.
     */
    public static class Person {
        private String name;
        private int age;
        private String email;
        
        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        public Person(String name, int age, String email) {
            this(name, age);
            this.email = email;
        }
        
        // Getters
        public String getName() { return name; }
        public int getAge() { return age; }
        public String getEmail() { return email; }
        
        // Setters
        public void setName(String name) { this.name = name; }
        public void setAge(int age) { this.age = age; }
        public void setEmail(String email) { this.email = email; }
        
        public String greet() {
            return String.format("Hello, I'm %s and I'm %d years old", name, age);
        }
        
        public boolean isAdult() {
            return age >= 18;
        }
        
        @Override
        public String toString() {
            return String.format("Person{name='%s', age=%d, email='%s'}", 
                               name, age, email);
        }
        
        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            Person person = (Person) obj;
            return age == person.age && 
                   Objects.equals(name, person.name) && 
                   Objects.equals(email, person.email);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(name, age, email);
        }
    }
    
    /**
     * Interface for greeting functionality.
     */
    public interface Greeter {
        String greet();
    }
    
    /**
     * File processor for handling file operations.
     */
    public static class FileProcessor {
        private Path basePath;
        private List<String> processedFiles;
        
        public FileProcessor(String basePath) {
            this.basePath = Paths.get(basePath);
            this.processedFiles = new ArrayList<>();
        }
        
        public FileProcessor(Path basePath) {
            this.basePath = basePath;
            this.processedFiles = new ArrayList<>();
        }
        
        /**
         * Reads content from a file.
         * @param filename the name of the file to read
         * @return the file content as a string
         * @throws IOException if file reading fails
         */
        public String readFile(String filename) throws IOException {
            Path filePath = basePath.resolve(filename);
            String content = Files.readString(filePath);
            processedFiles.add(filename);
            return content;
        }
        
        /**
         * Writes content to a file.
         * @param filename the name of the file to write
         * @param content the content to write
         * @throws IOException if file writing fails
         */
        public void writeFile(String filename, String content) throws IOException {
            Path filePath = basePath.resolve(filename);
            Files.writeString(filePath, content);
            processedFiles.add(filename);
        }
        
        /**
         * Gets processing statistics.
         * @return a map containing processing statistics
         */
        public Map<String, Object> getStats() {
            Map<String, Object> stats = new HashMap<>();
            stats.put("basePath", basePath.toString());
            stats.put("processedFilesCount", processedFiles.size());
            stats.put("files", new ArrayList<>(processedFiles));
            return stats;
        }
        
        public List<String> getProcessedFiles() {
            return new ArrayList<>(processedFiles);
        }
    }
    
    /**
     * Utility class for argument processing.
     */
    public static class ArgumentProcessor {
        
        /**
         * Processes command line arguments.
         * @param args the command line arguments
         * @return processed arguments as a list
         */
        public static List<String> processArguments(String[] args) {
            return Arrays.stream(args)
                    .skip(1) // Skip program name (though in Java it's not included)
                    .filter(arg -> !arg.trim().isEmpty())
                    .map(String::toUpperCase)
                    .collect(Collectors.toList());
        }
        
        /**
         * Parses key-value pairs from arguments.
         * @param args command line arguments in key=value format
         * @return map of key-value pairs
         */
        public static Map<String, String> parseKeyValueArgs(String[] args) {
            return Arrays.stream(args)
                    .filter(arg -> arg.contains("="))
                    .map(arg -> arg.split("=", 2))
                    .filter(parts -> parts.length == 2)
                    .collect(Collectors.toMap(
                        parts -> parts[0].trim(),
                        parts -> parts[1].trim()
                    ));
        }
    }
    
    /**
     * Custom exception for demonstration.
     */
    public static class ProcessingException extends Exception {
        public ProcessingException(String message) {
            super(message);
        }
        
        public ProcessingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
    
    /**
     * Main method demonstrating the class functionality.
     * @param args command line arguments
     */
    public static void main(String[] args) {
        try {
            // Create a person
            Person person = new Person("Alice Smith", 25, "alice@example.com");
            System.out.println(person.greet());
            System.out.println("Is adult: " + person.isAdult());
            System.out.println("Person details: " + person);
            
            // File processing example
            FileProcessor processor = new FileProcessor(".");
            
            // Process command line arguments
            if (args.length > 0) {
                List<String> processedArgs = ArgumentProcessor.processArguments(args);
                System.out.println("Processed arguments: " + processedArgs);
                
                Map<String, String> keyValueArgs = ArgumentProcessor.parseKeyValueArgs(args);
                if (!keyValueArgs.isEmpty()) {
                    System.out.println("Key-value arguments: " + keyValueArgs);
                }
            }
            
            // Display stats
            Map<String, Object> stats = processor.getStats();
            System.out.println("Processor stats: " + stats);
            
            // Demonstrate some Java 8+ features
            List<Person> people = Arrays.asList(
                new Person("John", 30),
                new Person("Jane", 25),
                new Person("Bob", 17),
                new Person("Alice", 35)
            );
            
            List<String> adultNames = people.stream()
                    .filter(Person::isAdult)
                    .map(Person::getName)
                    .sorted()
                    .collect(Collectors.toList());
            
            System.out.println("Adult names: " + adultNames);
            
            // Calculate average age of adults
            OptionalDouble averageAge = people.stream()
                    .filter(Person::isAdult)
                    .mapToInt(Person::getAge)
                    .average();
            
            if (averageAge.isPresent()) {
                System.out.printf("Average age of adults: %.2f%n", averageAge.getAsDouble());
            }
            
        } catch (Exception e) {
            System.err.println("Error occurred: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
