# Refactoring Rule: Introduce Parameter Object

## Intent
A method contains a group of parameters that naturally go together. Replace these parameters with a single object or a Java record.

## Motivation
Methods with too many parameters are difficult to read and error-prone. Grouping parameters into a Parameter Object (or record in Java 14+) simplifies signatures, enables easier validation, and provides a logical home for operations on that data.

## Before Refactoring
```java
public class Account {
    public double getFlowBetween(Date start, Date end) {
        // ...
    }
}
```

## After Refactoring
```java
public record DateRange(Date start, Date end) {
    public boolean includes(Date date) {
        return !date.before(start) && !date.after(end);
    }
}

public class Account {
    public double getFlowBetween(DateRange range) {
        // ...
    }
}
```

## How to Apply
1. Create a new class or  (preferred in modern Java) to represent the group of parameters.
2. Make the fields immutable (final) and provide accessor methods.
3. Add the new object/record parameter to the method signature.
4. For each parameter in the group, replace references inside the method with calls to the record/object.
5. Remove the old parameters from the method signature and update all callers.
