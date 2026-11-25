package com.joysistvi.s03.activity;


import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("ExpenseCalculator_Activity Test Suite")
public class ExpenseCalculator_ActivityTest extends ConsoleTestBase {

    @Test
    @DisplayName("Should display the monthly expense breakdown header and total income")
    void testHeaderAndIncomeDisplay() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput();
        assertFalse(output.isEmpty(), "Console output should not be empty.");

        assertTrue(
                output.toLowerCase().contains("monthly expense breakdown"),
                "Failure: Activity header 'Monthly Expense Breakdown' was not found in the output."
        );
        assertTrue(
                output.contains("50000") || output.contains("50,000"),
                "Failure: Total income of 50,000 was not correctly displayed."
        );
    }

    @Test
    @DisplayName("Should display all individual expense categories (Food, Transport, Rent, Utility)")
    void testExpenseCategoriesPresent() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput();
        String lowerOutput = output.toLowerCase();

        assertTrue(lowerOutput.contains("food"), "Failure: 'Food Allowance' category is missing from the output.");
        assertTrue(lowerOutput.contains("transportation"), "Failure: 'Transportation' category is missing from the output.");
        assertTrue(lowerOutput.contains("rent"), "Failure: 'Rent' category is missing from the output.");
        assertTrue(lowerOutput.contains("utility"), "Failure: 'Utility Bill' category is missing from the output.");
    }

    @Test
    @DisplayName("Should correctly calculate and display expense percentage breakdown")
    void testCorrectExpensePercentages() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput();

        assertTrue(output.contains("30.0%"), "Failure: Expected 30.0% for food allowance percentage.");
        assertTrue(output.contains("5.0%"), "Failure: Expected 5.0% for transportation percentage.");
        assertTrue(output.contains("9.0%"), "Failure: Expected 9.0% for rent percentage.");
        assertTrue(output.contains("7.0%"), "Failure: Expected 7.0% for utility bill percentage.");
    }

    @Test
    @DisplayName("Should display total expenses and remaining balance summary")
    void testSummaryAndRemainingBalance() {
        ExpenseCalculator_Activity.main(new String[]{});

        String output = getOutput().toLowerCase();

        assertTrue(
                output.contains("total expenses"),
                "Failure: 'Total Expenses' summary line is missing."
        );
        assertTrue(
                output.contains("remaining balance"),
                "Failure: 'Remaining Balance' summary line is missing."
        );
    }
}