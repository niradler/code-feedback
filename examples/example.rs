// Example Rust file demonstrating various language features
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::Path;

/// Represents a person with basic information
#[derive(Debug, Clone)]
pub struct Person {
    pub name: String,
    pub age: u32,
    pub email: Option<String>,
}

/// Trait for greeting functionality
pub trait Greeter {
    fn greet(&self) -> String;
}

impl Greeter for Person {
    fn greet(&self) -> String {
        format!("Hello, I'm {} and I'm {} years old", self.name, self.age)
    }
}

impl Person {
    /// Creates a new Person instance
    pub fn new(name: String, age: u32) -> Self {
        Person {
            name,
            age,
            email: None,
        }
    }

    /// Sets the email for the person
    pub fn with_email(mut self, email: String) -> Self {
        self.email = Some(email);
        self
    }

    /// Checks if the person is an adult
    pub fn is_adult(&self) -> bool {
        self.age >= 18
    }
}

/// File processor for handling file operations
pub struct FileProcessor {
    base_path: String,
    processed_files: Vec<String>,
}

impl FileProcessor {
    /// Creates a new FileProcessor
    pub fn new<P: AsRef<Path>>(base_path: P) -> Self {
        FileProcessor {
            base_path: base_path.as_ref().to_string_lossy().to_string(),
            processed_files: Vec::new(),
        }
    }

    /// Reads content from a file
    pub fn read_file<P: AsRef<Path>>(&mut self, filename: P) -> io::Result<String> {
        let file_path = Path::new(&self.base_path).join(filename.as_ref());
        let mut file = File::open(&file_path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;
        
        self.processed_files.push(
            filename.as_ref().to_string_lossy().to_string()
        );
        
        Ok(content)
    }

    /// Writes content to a file
    pub fn write_file<P: AsRef<Path>>(&mut self, filename: P, content: &str) -> io::Result<()> {
        let file_path = Path::new(&self.base_path).join(filename.as_ref());
        let mut file = File::create(&file_path)?;
        file.write_all(content.as_bytes())?;
        
        self.processed_files.push(
            filename.as_ref().to_string_lossy().to_string()
        );
        
        Ok(())
    }

    /// Gets processing statistics
    pub fn get_stats(&self) -> HashMap<String, serde_json::Value> {
        let mut stats = HashMap::new();
        stats.insert("base_path".to_string(), 
                    serde_json::Value::String(self.base_path.clone()));
        stats.insert("processed_files_count".to_string(), 
                    serde_json::Value::Number(self.processed_files.len().into()));
        stats.insert("files".to_string(), 
                    serde_json::Value::Array(
                        self.processed_files.iter()
                            .map(|f| serde_json::Value::String(f.clone()))
                            .collect()
                    ));
        stats
    }
}

/// Processes command line arguments
pub fn process_arguments(args: Vec<String>) -> Vec<String> {
    args.into_iter()
        .skip(1) // Skip program name
        .filter(|arg| !arg.trim().is_empty())
        .map(|arg| arg.to_uppercase())
        .collect()
}

/// Main function demonstrating the module functionality
fn main() -> io::Result<()> {
    // Create a person
    let person = Person::new("Alice Smith".to_string(), 25)
        .with_email("alice@example.com".to_string());
    
    println!("{}", person.greet());
    println!("Is adult: {}", person.is_adult());

    // File processing example
    let mut processor = FileProcessor::new(".");
    
    // Process command line arguments
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        let processed_args = process_arguments(args);
        println!("Processed arguments: {:?}", processed_args);
    }

    // Display stats
    let stats = processor.get_stats();
    println!("Processor stats: {}", serde_json::to_string_pretty(&stats)?);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_person_creation() {
        let person = Person::new("John Doe".to_string(), 30);
        assert_eq!(person.name, "John Doe");
        assert_eq!(person.age, 30);
        assert!(person.email.is_none());
    }

    #[test]
    fn test_person_with_email() {
        let person = Person::new("Jane Doe".to_string(), 25)
            .with_email("jane@example.com".to_string());
        assert!(person.email.is_some());
        assert_eq!(person.email.unwrap(), "jane@example.com");
    }

    #[test]
    fn test_is_adult() {
        let adult = Person::new("Adult".to_string(), 18);
        let minor = Person::new("Minor".to_string(), 17);
        
        assert!(adult.is_adult());
        assert!(!minor.is_adult());
    }

    #[test]
    fn test_process_arguments() {
        let args = vec![
            "program_name".to_string(),
            "hello".to_string(),
            "world".to_string(),
            "".to_string(),
            "rust".to_string(),
        ];
        
        let processed = process_arguments(args);
        assert_eq!(processed, vec!["HELLO", "WORLD", "RUST"]);
    }
}
