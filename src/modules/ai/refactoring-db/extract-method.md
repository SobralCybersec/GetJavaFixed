# Refactoring Rule: Extract Method

## Intent
You have a code fragment that can be grouped together. Turn the fragment into a method whose name explains the purpose of the method.

## Motivation
Long methods are hard to read, maintain, and test. Extracting method fragments into small, focused helper methods makes the code self-documenting and highly reusable.

## Before Refactoring
```java
public void printOwing() {
    printBanner();

    // calculate outstanding
    double outstanding = 0.0;
    for (Order order : orders) {
        outstanding += order.getAmount();
    }

    // print details
    System.out.println("name: " + name);
    System.out.println("amount: " + outstanding);
}
```

## After Refactoring
```java
public void printOwing() {
    printBanner();
    double outstanding = getOutstanding();
    printDetails(outstanding);
}

private double getOutstanding() {
    double result = 0.0;
    for (Order order : orders) {
        result += order.getAmount();
    }
    return result;
}

private void printDetails(double outstanding) {
    System.out.println("name: " + name);
    System.out.println("amount: " + outstanding);
}
```

## How to Apply
1. Create a new method and name it according to its intent (what it does, not how it does it).
2. Copy the extracted code fragment into the new method.
3. Pass any local variables of the source method that are read by the extracted code as parameters.
4. If a local variable is modified by the extracted code, return it as the method's return value.
5. Replace the extracted code block in the source method with a call to the new method.
