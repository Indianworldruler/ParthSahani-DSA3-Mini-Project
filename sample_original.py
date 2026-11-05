def sum_even(numbers):
    total = 0
    for value in numbers:
        if value % 2 == 0:
            total += value
    return total

print(sum_even([1, 2, 3, 4, 5, 6]))
