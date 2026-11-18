package com.joysistvi.s03.activity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("ExpenseCalculator_Activity Test Suite")
public class ExpenseCalculator_ActivityTest extends ConsoleTestBase {

    @Test
    @DisplayName("Should display total income, expense categories, and remaining balance")
    void testMainCalculatesExpensesCorrectly() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput();
        assertFalse(output.isEmpty(), "Console output should not be empty.");

        // Verify key headers and labels
        assertTrue(
                output.toLowerCase().contains("monthly expense breakdown"),
                "Output should contain the activity header."
        );
        assertTrue(
                output.contains("50000") || output.contains("50,000"),
                "Output should display the total income."
        );
        assertTrue(
                output.toLowerCase().contains("remaining balance"),
                "Output should display the remaining balance section."
        );
    }

    @Test
    @DisplayName("Should correctly calculate and display expense percentages and breakdown")
    void testExpensePercentagesAndBreakdown() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput();

        // Verify individual expense labels
        assertTrue(output.toLowerCase().contains("food"), "Output should contain 'Food Allowance'.");
        assertTrue(output.toLowerCase().contains("transportation"), "Output should contain 'Transportation'.");
        assertTrue(output.toLowerCase().contains("rent"), "Output should contain 'Rent'.");
        assertTrue(output.toLowerCase().contains("utility"), "Output should contain 'Utility Bill'.");

        // Verify calculated percentage values (30.0%, 5.0%, 9.0%, 7.0%)
        assertTrue(output.contains("30.0%"), "Output should display correct food percentage (30.0%).");
        assertTrue(output.contains("5.0%"), "Output should display correct transportation percentage (5.0%).");
        assertTrue(output.contains("9.0%"), "Output should display correct rent percentage (9.0%).");
        assertTrue(output.contains("7.0%"), "Output should display correct utility percentage (7.0%).");
    }
}