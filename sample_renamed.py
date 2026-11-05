# Same structure with different names
def add_even(items):
    result = 0
    for item in items:
        if item % 2 == 0:
            result += item
    return result

print(add_even([1, 2, 3, 4, 5, 6]))
