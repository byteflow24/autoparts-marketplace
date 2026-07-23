import math
nums = [3, 5, 2, 10, 7]
min = 999999
max = -1
# count = 0
largest = nums[0]
smallest = nums[0]
# word = "hello"
result = ""
word = "banana"
count = {}

# print(f" The sum is: {sum(nums)}")
for ch in word:
    if ch in count:
        count += 1