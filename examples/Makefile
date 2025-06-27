# Simple Makefile for testing make commands

# Variables
CC = gcc
CFLAGS = -Wall -Wextra -std=c99
SRCDIR = src
BUILDDIR = build
SOURCES = $(wildcard $(SRCDIR)/*.c)
OBJECTS = $(SOURCES:$(SRCDIR)/%.c=$(BUILDDIR)/%.o)
TARGET = $(BUILDDIR)/main

# Default target
.PHONY: all clean test help

all: $(TARGET)

# Create build directory if it doesn't exist
$(BUILDDIR):
	mkdir -p $(BUILDDIR)

# Compile object files
$(BUILDDIR)/%.o: $(SRCDIR)/%.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Link the final executable
$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) -o $@

# Build target
build: $(TARGET)
	@echo "Build completed successfully!"

# Test target
test: $(TARGET)
	@echo "Running tests..."
	@echo "All tests passed!"

# Clean build artifacts
clean:
	rm -rf $(BUILDDIR)
	@echo "Clean completed!"

# Install (example)
install: $(TARGET)
	@echo "Installing $(TARGET)..."
	@echo "Install completed!"

# Help
help:
	@echo "Available targets:"
	@echo "  all     - Build the project (default)"
	@echo "  build   - Build the project"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean build artifacts"
	@echo "  install - Install the binary"
	@echo "  help    - Show this help message"

# Linting (if you have clang-format or similar)
lint:
	@echo "Running code formatting check..."
	@echo "Lint completed!"

# Format code
format:
	@echo "Formatting code..."
	@echo "Format completed!"
