package com.joysistvi.s02.activity;


import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("DataType_Activity Test Suite")
public class DataType_ActivityTest extends ConsoleTestBase {

    @Test
    @DisplayName("Should display primitive data type variables correctly")
    void testPrimitiveDataTypesOutput() {
        DataType_Activity.main(new String[]{});

        String output = getOutput();
        assertFalse(output.isEmpty(), "Console output should not be empty.");

        assertTrue(
                output.toLowerCase().contains("age") || output.toLowerCase().contains("int"),
                "Output should display integer or age variable values."
        );
        assertTrue(
                output.toLowerCase().contains("price") || output.toLowerCase().contains("double") || output.toLowerCase().contains("float"),
                "Output should display floating-point or price variable values."
        );
    }

    @Test
    @DisplayName("Should display character and boolean data types correctly")
    void testCharAndBooleanOutput() {
        DataType_Activity.main(new String[]{});

        String output = getOutput();

        assertTrue(
                output.toLowerCase().contains("grade") || output.toLowerCase().contains("char") || output.toLowerCase().contains("true") || output.toLowerCase().contains("false"),
                "Output should display character and boolean status values."
        );
    }

    @Test
    @DisplayName("Should display reference data types (String) correctly")
    void testStringDataTypeOutput() {
        DataType_Activity.main(new String[]{});

        String output = getOutput();

        assertTrue(
                output.toLowerCase().contains("name") || output.toLowerCase().contains("string"),
                "Output should display string or name variable values."
        );
    }
}