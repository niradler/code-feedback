#!/usr/bin/env python3
"""
Example Python module demonstrating various features and potential linting issues.
"""

import os
import sys
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Person:
    """Data class representing a person."""
    name: str
    age: int
    email: Optional[str] = None

    def greet(self) -> str:
        """Return a greeting message."""
        return f"Hello, I'm {self.name} and I'm {self.age} years old"

    def is_adult(self) -> bool:
        """Check if person is an adult."""
        return self.age >= 18


class FileProcessor:
    """Class for processing files with various operations."""
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
        self.processed_files: List[str] = []

    def read_file(self, filename: str) -> Optional[str]:
        """Read content from a file."""
        file_path = self.base_path / filename
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                self.processed_files.append(filename)
                return content
        except FileNotFoundError:
            print(f"File not found: {filename}")
            return None
        except Exception as e:
            print(f"Error reading file {filename}: {e}")
            return None

    def write_file(self, filename: str, content: str) -> bool:
        """Write content to a file."""
        file_path = self.base_path / filename
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
                self.processed_files.append(filename)
                return True
        except Exception as e:
            print(f"Error writing file {filename}: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return {
            'base_path': str(self.base_path),
            'processed_files': len(self.processed_files),
            'files': self.processed_files
        }


def process_arguments(args: List[str]) -> List[str]:
    """Process command line arguments."""
    processed = []
    for arg in args[1:]:  # Skip script name
        if arg.strip():
            processed.append(arg.upper())
    return processed


def main() -> None:
    """Main function demonstrating the module functionality."""
    # Create a person
    person = Person(name="Alice Smith", age=25, email="alice@example.com")
    print(person.greet())
    print(f"Is adult: {person.is_adult()}")

    # File processing example
    processor = FileProcessor()
    
    # Process command line arguments
    if len(sys.argv) > 1:
        processed_args = process_arguments(sys.argv)
        print(f"Processed arguments: {processed_args}")

    # Display stats
    stats = processor.get_stats()
    print(f"Processor stats: {stats}")


if __name__ == "__main__":
    main()
