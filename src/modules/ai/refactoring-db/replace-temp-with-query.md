# Refactoring Rule: Replace Temp with Query

## Intent
You have a temporary variable that holds the result of an expression. Extract the expression into a dedicated method (query), and replace all references to the temp variable with the method call.

## Motivation
Temporary variables encourage long, complex methods. By extracting the calculation into a query method, you make the logic reusable across other methods in the class, reduce method size, and pave the way for further refactorings like "Extract Method".

## Before Refactoring
```java
public class Order {
    private double quantity;
    private double itemPrice;

    public double calculateTotal() {
        double basePrice = quantity * itemPrice;
        if (basePrice > 1000) {
            return basePrice * 0.95;
        } else {
            return basePrice * 0.98;
        }
    }
}
```

## After Refactoring
```java
public class Order {
    private double quantity;
    private double itemPrice;

    public double calculateTotal() {
        if (basePrice() > 1000) {
            return basePrice() * 0.95;
        } else {
            return basePrice() * 0.98;
        }
    }

    private double basePrice() {
        return quantity * itemPrice;
    }
}
```

## How to Apply
1. Find the temporary variable that is assigned once.
2. Extract the right-hand side of the assignment into a private helper method (query).
3. Ensure the extracted method has no side effects (it only reads state and returns a value).
4. Replace all occurrences of the temporary variable with a call to the new query method.
5. Delete the declaration and assignment of the temporary variable.
