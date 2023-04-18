ChatGPT CLI
---
This is a tiny toy program to run ChatGPT in your terminal:
```shell
export OPENAI_API_KEY=XXXXXXXX # Get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

### Sample interaction
```
Available commands:
 * clear / clr: Clear chat history
 * exit / quit / q: Exit the program
────────────────────────────────────────────────────────────────────────────────────
> Hi! My name is Rick!
Hi Rick! How can I assist you today?
────────────────────────────────────────────────────────────────────────────────────
> What is my name?
Your name is Rick, as you mentioned earlier. How can I assist you today, Rick?
────────────────────────────────────────────────────────────────────────────────────
> clear
Chat history cleared!
────────────────────────────────────────────────────────────────────────────────────
> What is my name?
As an AI language model, I don't have access to personal information like your name unless you tell me what it is.
────────────────────────────────────────────────────────────────────────────────────
> Write a haiku about fish
Fish swims in the sea
Graceful, agile, and free
In water, it be.
────────────────────────────────────────────────────────────────────────────────────
> How do humans make babies? Respond in emojis
👨‍❤️‍️‍👩 + 💏️ = 👶
────────────────────────────────────────────────────────────────────────────────────
> exit
Bye!
```

### Web Browsing
To enable browsing, you need to export Google API keys:
```shell
export GOOGLE_CUSTOM_SEARCH_ENGINE_ID=XXXXX # Get from https://www.google.com/cse/create/new
export GOOGLE_CUSTOM_SEARCH_API_KEY=XXXXX # Get from https://developers.google.com/custom-search/v1/introduction
```