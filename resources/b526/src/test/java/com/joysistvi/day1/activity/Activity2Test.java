package com.joysistvi.day1.activity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.joysistvi.day1.activity.Activity2;
import org.junit.jupiter.api.Test;

public class Activity2Test {

    // Given values mula sa Activity 2 instructions:
    double income = 50000;
    double foodAllowance = 15000;
    double transportation = 2500;
    double rent = 4500;
    double utilityBill = 3500;

    @Test
    public void testRemainingBalance() {
        double expectedBalance = 24500.0;
        // Gagamitin na natin ang fixed Class name: Activity2
        double actualBalance = Activity2.getRemainingBalance(income, foodAllowance, transportation, rent, utilityBill);
        assertEquals(expectedBalance, actualBalance, 0.01, "Remaining balance calculation is incorrect!");
    }

    @Test
    public void testFoodAllowancePercentage() {
        double expectedPercent = 30.0;
        double actualPercent = Activity2.getExpensePercentage(foodAllowance, income);
        assertEquals(expectedPercent, actualPercent, 0.01, "Food allowance percentage is incorrect!");
    }

    @Test
    public void testRentPercentage() {
        double expectedPercent = 9.0;
        double actualPercent = Activity2.getExpensePercentage(rent, income);
        assertEquals(expectedPercent, actualPercent, 0.01, "Rent percentage is incorrect!");
    }

    @Test
    public void testUtilityBillPercentage() {
        double expectedPercent = 7.0;
        double actualPercent = Activity2.getExpensePercentage(utilityBill, income);
        assertEquals(expectedPercent, actualPercent, 0.01, "Utility bill percentage is incorrect!");
    }
}
