package com.joysistvi.s01.activity; // <--- Binago natin ang package

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class ConsoleTestBase {
    protected final ByteArrayOutputStream outContent = new ByteArrayOutputStream();
    private final PrintStream originalOut = System.out;

    @BeforeEach
    public void setUpStreams() { System.setOut(new PrintStream(outContent)); }

    @AfterEach
    public void restoreStreams() { System.setOut(originalOut); }

    public void provideInput(String data) { System.setIn(new ByteArrayInputStream(data.getBytes())); }

    public void assertOutputContains(String expected) {
        assertTrue(outContent.toString().contains(expected));
    }
    // I-add mo ito sa loob ng ConsoleTestBase class:
    public String getOutput() {
        return outContent.toString();
    }

}
