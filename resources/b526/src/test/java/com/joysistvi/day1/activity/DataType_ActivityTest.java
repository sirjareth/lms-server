package com.joysistvi.day1.activity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

public class DataType_ActivityTest extends ConsoleTestBase {

    @Test
    @DisplayName("Test if DataType_Activity runs and prints all required data types")
    public void testDataTypeActivityOutput() {
        // 1. Patakbuhin ang main method ng DataType_Activity class ni student
        DataType_Activity.main(new String[]{});

        // 2. Kunin ang lahat ng na-print sa console
        String output = getOutput();

        // Siguraduhing may na-print sa console (hindi blank)
        assertFalse(output.trim().isEmpty(), "The console output should not be empty.");

        // 3. I-verify ang bawat Data Type value o key label sa output:

        // String (e.g. Student Name)
        assertTrue(output.contains("Juan Dela Cruz") || output.toLowerCase().contains("string"),
                "Output should contain a String value/label.");

        // char (e.g. Section 'A')
        assertTrue(output.contains("A") || output.toLowerCase().contains("char"),
                "Output should contain a char value/label.");

        // byte / short / int (e.g. Age, Year, Count)
        assertTrue(output.contains("20") || output.contains("1500"),
                "Output should contain integer numeric values (byte/short/int).");

        // long (e.g. 8000000000)
        assertTrue(output.contains("8000000000") || output.toLowerCase().contains("long"),
                "Output should contain a long numeric value.");

        // float / double (e.g. 36.6 or 3.14159)
        assertTrue(output.contains("36.6") || output.contains("3.14159") || output.toLowerCase().contains("double"),
                "Output should contain floating point values (float/double).");

        // boolean (true or false)
        assertTrue(output.toLowerCase().contains("true") || output.toLowerCase().contains("false"),
                "Output should contain a boolean value (true/false).");
    }
}
