ChatGPT CLI
---
This is a tiny toy program written in node.js to run ChatGPT in your terminal:

1. Install `yarn` and `node` e.g. using `brew`:
```shell
brew install node yarn
```

2. Start the app:
```shell
export OPENAI_API_KEY=XXXXXXXX # Get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

## Sample interaction
```
Available commands:
 * clear / clr     : Clear chat history
 * copy / cp       : Copy last message to clipboard
 * exit / quit / q : Exit the program
For multiline chats, press PageDown
────────────────────────────────────────────────────────────────────────────────────
> Hi! My name is Rick!
Hi Rick! How can I assist you today?
────────────────────────────────────────────────────────────────────────────────────
> copy
Copied last message to clipboard (34 characters)
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

## Web Browsing
```
> Whats the weather like in nyc today?
⚠ I do not have real-time information. Please check a weather website or app for the current weather in NYC.
```
To enable browsing, you need to setup Google API keys:
```shell
export GOOGLE_CUSTOM_SEARCH_ENGINE_ID=XXXXX # Get from https://www.google.com/cse/create/new
export GOOGLE_CUSTOM_SEARCH_API_KEY=XXXXX # Get from https://developers.google.com/custom-search/v1/introduction
```

Now you will get:
```shell
> Whats the weather like in nyc today?
⚠ I do not have real-time information. Please check a weather website or app for the current weather in NYC.
⠸ Searching the web ...
✔ Today in New York City, the temperature will be mostly cloudy with a high of 58°F (14°C) and a low of 46°F (8°C). There will be partly cloudy skies in the morning, which will become cloudy during the afternoon. There is a chance of light winds from the west, southwest.
```