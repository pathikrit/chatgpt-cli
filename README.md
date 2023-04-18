ChatGPT CLI
---
This is a tiny toy program to run ChatGPT in your terminal:
```shell
export OPENAI_API_KEY=XXXXXXXX # get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

### Sample interaction

```shell
Available commands:
 * clear: Clears chat history
 * exit: Exits the program
────────────────────────────────────────────────────────────────────────────────────
> My name is Rick
Hi Rick! How can I assist you today?
────────────────────────────────────────────────────────────────────────────────────
> What's my name?
Your name is Rick.
────────────────────────────────────────────────────────────────────────────────────
> clear
Chat history is now cleared!
────────────────────────────────────────────────────────────────────────────────────
> What's my name?
I have already answered your question. Your name is Rick. Is there anything else you
 need assistance with?
────────────────────────────────────────────────────────────────────────────────────
> Write python program to find longest common subsequence
Sure! Here's a Python program that finds the longest common subsequence between two
 strings:
 
   1 def longest_common_subsequence(str1, str2):
   2     m = len(str1)
   3     n = len(str2)
   4     lcs_matrix = [[0 for i in range(n+1)] for j in range(m+1)]
   5     for i in range(1, m+1):
   6         for j in range(1, n+1):
   7             if str1[i-1] == str2[j-1]:
   8                 lcs_matrix[i][j] = lcs_matrix[i-1][j-1] + 1
   9             else:
  10                 lcs_matrix[i][j] = max(lcs_matrix[i-1][j], 
     lcs_matrix[i][j-1])
  11     lcs = ''
  12     i = m
  13     j = n
  14     while i > 0 and j > 0:
  15         if str1[i-1] == str2[j-1]:
  16             lcs = str1[i-1] + lcs
  17             i -= 1
  18             j -= 1
  19         elif lcs_matrix[i-1][j] > lcs_matrix[i][j-1]:
  20             i -= 1
  21         else:
  22             j -= 1
  23     return lcs
  24 
  25 str1 = 'AGGTAB'
  26 str2 = 'GXTXAYB'
  27 print('Longest common subsequence:', longest_common_subsequence(str1, str2))
 
 Output:
 
  1 Longest common subsequence: GTAB
 
 Here we have used dynamic programming approach to solve the problem.
────────────────────────────────────────────────────────────────────────────────────
> Write a haiku about fish
Graceful in water,
Silvery scales glistening,
Fish swim with purpose.
────────────────────────────────────────────────────────────────────────────────────
> exit
```