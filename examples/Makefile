# Simple example Makefile for demonstrating make structure

# Variables
PROJECT = example-project
VERSION = 1.0

# Default target
.DEFAULT_GOAL := all

# Phony targets (don't create files with these names)
.PHONY: all build test clean install help

# Default target
all:
	@echo "Building $(PROJECT) version $(VERSION)"

# Build target
build:
	@echo "Compiling source files"

# Test target  
test:
	@echo "Running tests"

# Clean target
clean:
	@echo "Cleaning build artifacts"

# Install target
install:
	@echo "Installing $(PROJECT)"

# Help target
help:
	@echo "Available targets:"
	@echo "  all     - Build the project (default)"
	@echo "  build   - Compile source files"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean build artifacts" 
	@echo "  install - Install the project"
	@echo "  help    - Show this help"