package com.joysistvi.s01.activity;

import com.joysistvi.test.ConsoleTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("HelloWorld_Activity Test Suite")
public class HelloWorld_ActivityTest extends ConsoleTestBase {

    @Test
    @DisplayName("Should print 'Hello, World!' to the console")
    void testMainPrintsHelloWorld() {
        HelloWorld_Activity.main(new String[]{});

        String output = getOutput().trim();
        assertFalse(output.isEmpty(), "Console output should not be empty.");

        // Flexible check allowing variations such as "Hello, World!" or "Hello World"
        String normalizedOutput = output.toLowerCase().replaceAll("[,!]", "");
        assertTrue(
                normalizedOutput.contains("hello world"),
                "Expected console output to contain 'Hello, World!' (or 'Hello World'), but got: \"" + output + "\""
        );
    }

    @Test
    @DisplayName("Should include standard greeting components 'Hello' and 'World'")
    void testOutputContainsGreetingComponents() {
        HelloWorld_Activity.main(new String[]{});

        String outputLower = getOutput().toLowerCase();
        assertTrue(
                outputLower.contains("hello"),
                "Expected output to contain 'Hello', but got: \"" + getOutput() + "\""
        );
        assertTrue(
                outputLower.contains("world"),
                "Expected output to contain 'World', but got: \"" + getOutput() + "\""
        );
    }
}