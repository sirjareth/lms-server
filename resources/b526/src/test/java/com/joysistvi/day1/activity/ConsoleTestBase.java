package com.joysistvi.day1.activity;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.PrintStream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Base class for console-based Java tests.
 * Captures System.out and provides a way to simulate System.in.
 */
public class ConsoleTestBase {
    protected final ByteArrayOutputStream outContent = new ByteArrayOutputStream();
    private final PrintStream originalOut = System.out;
    private final InputStream originalIn = System.in;

    @BeforeEach
    public void setUpStreams() {
        System.setOut(new PrintStream(outContent));
    }

    @AfterEach
    public void restoreStreams() {
        System.setOut(originalOut);
        System.setIn(originalIn);
    }

    /**
     * Simulates user input for Scanner.
     */
    protected void provideInput(String data) {
        ByteArrayInputStream testIn = new ByteArrayInputStream(data.getBytes());
        System.setIn(testIn);
    }

    /**
     * Gets the captured console output.
     */
    protected String getOutput() {
        return outContent.toString();
    }

    /**
     * Helper to assert that the console output contains a specific string.
     */
    protected void assertOutputContains(String expected) {
        assertTrue(getOutput().contains(expected), "Expected output to contain [" + expected + "] but it did not.\nCaptured Output:\n" + getOutput());
    }
}
