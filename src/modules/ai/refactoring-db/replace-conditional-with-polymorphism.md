# Refactoring Rule: Replace Conditional with Polymorphism

## Intent
You have a conditional that performs different actions depending on the type of an object. Move each leg of the conditional to an overriding method in a subclass or implementation, and make the original method polymorphic.

## Motivation
Switch statements or complex  chains checking type codes or object states are hard to extend. Polymorphism delegates the decision-making to the classes themselves, making it easy to add new types without modifying existing methods.

## Before Refactoring
```java
public class Employee {
    private int type;
    static final int ENGINEER = 0;
    static final int SALESMAN = 1;

    public double getPayAmount() {
        switch (type) {
            case ENGINEER:
                return monthlySalary;
            case SALESMAN:
                return monthlySalary + commission;
            default:
                throw new RuntimeException("Incorrect Employee Type");
        }
    }
}
```

## After Refactoring
```java
public abstract class EmployeeType {
    public abstract double getPayAmount(Employee emp);
}

public class Engineer extends EmployeeType {
    @Override
    public double getPayAmount(Employee emp) {
        return emp.getMonthlySalary();
    }
}

public class Salesman extends EmployeeType {
    @Override
    public double getPayAmount(Employee emp) {
        return emp.getMonthlySalary() + emp.getCommission();
    }
}
```

## How to Apply
1. Create subclasses or implementation classes for each branch of the conditional.
2. Define a polymorphic method in the base class (or interface).
3. Copy the code from the corresponding conditional branch into the overriding method of each subclass.
4. Replace the conditional with a call to the polymorphic method.
