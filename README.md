ChatGPT CLI
---
This is a tiny ([<300 LoC](app.js)) program written in node.js to run ChatGPT in your terminal that supports [web-browsing](#web-browsing), text-to-speech

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
System commands:
  * clear / clr     : Clear chat history
  * copy / cp       : Copy last message to clipboard
  * history / h     : Show current history
  * speak / say     : Speak out last response
  * help / ?        : Show this message
  * exit / quit / q : Exit the program

Usage Tips:
  - For multiline chats press PageDown
  - Use Up/Down array keys to scrub through previous messages
  - Include [web] anywhere in your prompt to force web browsing

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
Some queries depend on up-to-date info e.g.:
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
✔ As of April 19, 2023, the weather in New York City today is cloudy with a temperature of 67°F (19.4°C).
```

You can also force web browsing by including `[web]` anywhere in your prompt.