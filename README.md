ChatGPT CLI
---
This is a tiny toy program to run ChatGPT in your terminal:
```shell
export OPENAI_API_KEY=XXXXXXXX # get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

### Sample interaction
```
Available commands:
 * clear: Clears chat history
 * exit: Exits the program
────────────────────────────────────────────────────────────────────────────────────
> Hi! My name is Rick!
Hi Rick! How can I assist you today?
────────────────────────────────────────────────────────────────────────────────────
> What is my name?
Your name is Rick, as you mentioned earlier. How can I assist you today, Rick?
────────────────────────────────────────────────────────────────────────────────────
> clear
Chat history is now cleared!
────────────────────────────────────────────────────────────────────────────────────
> What is my name?
As an AI language model, I don't have access to personal information like your name unless you tell me what it is.
────────────────────────────────────────────────────────────────────────────────────
> Write a haiku about fish
Fish swims in the sea
Graceful, agile, and free
In water, it be.
────────────────────────────────────────────────────────────────────────────────────
> exit
```