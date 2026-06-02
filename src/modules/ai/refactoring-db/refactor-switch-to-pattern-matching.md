# Refactoring Rule: Refactor Switch to Pattern Matching (Java 17/21)

## Intent
You have switch statements or expressions checking object types (using instanceof). Refactor them to use pattern matching for switch, improving readability and safety.

## Motivation
Traditional type checking in Java requires verbose  checks followed by explicit casting. Java 17/21 introduces pattern matching in switch statements and expressions, allowing casting to be performed implicitly as part of type matching.

## Before Refactoring
```java
public String formatShape(Object shape) {
    if (shape instanceof Circle) {
        Circle c = (Circle) shape;
        return "Circle with radius " + c.getRadius();
    } else if (shape instanceof Rectangle) {
        Rectangle r = (Rectangle) shape;
        return "Rectangle with width " + r.getWidth();
    } else {
        return "Unknown shape";
    }
}
```

## After Refactoring
```java
public String formatShape(Object shape) {
    return switch (shape) {
        case Circle c -> "Circle with radius " + c.getRadius();
        case Rectangle r -> "Rectangle with width " + r.getWidth();
        case null, default -> "Unknown shape";
    };
}
```

## How to Apply
1. Identify  chains or switch statements that perform type casting.
2. Refactor to a  expression or statement on the target object.
3. Use  patterns to bind the cast variable automatically.
4. Always handle  safely (e.g., ) if necessary.
