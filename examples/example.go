package main

import (
	"fmt"
	"os"
	"strings"
)

// Person represents a person with basic information
type Person struct {
	Name string
	Age  int
}

// Greeter interface for greeting functionality
type Greeter interface {
	Greet() string
}

// Greet implements the Greeter interface
func (p Person) Greet() string {
	return fmt.Sprintf("Hello, I'm %s and I'm %d years old", p.Name, p.Age)
}

// processArgs processes command line arguments
func processArgs(args []string) []string {
	var processed []string
	for _, arg := range args[1:] { // Skip program name
		if strings.TrimSpace(arg) != "" {
			processed = append(processed, strings.ToUpper(arg))
		}
	}
	return processed
}

func main() {
	person := Person{
		Name: "John Doe",
		Age:  30,
	}

	fmt.Println(person.Greet())

	if len(os.Args) > 1 {
		processed := processArgs(os.Args)
		fmt.Printf("Processed args: %v\n", processed)
	}
}
