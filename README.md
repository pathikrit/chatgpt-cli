ChatGPT CLI
---
This is a tiny ([<500 LoC](app.js)) toy program written in node.js to run ChatGPT in your terminal that supports:
- [web-browsing](#web-browsing)
- text-to-speech (enter `speak`)
- image-generation (add `[img]` anywhere in prompt)
- chat history (enter `h`)
- export session to [ChatML](https://cobusgreyling.medium.com/the-introduction-of-chat-markup-language-chatml-is-important-for-a-number-of-reasons-5061f6fe2a85) (enter `export`) 
- auto-completions (hit `TAB`)
- [document chatting & summarization](#chatting-with-documents) 

## Setup

1. Install node.js e.g. using `brew`:
```shell
brew install node
```

2. Start the app:
```shell
export OPENAI_API_KEY=XXXXXXXX # Get from https://platform.openai.com/account/api-keys
npx git@github.com:pathikrit/chatgpt-cli.git
```

Alternatively, you can clone and run:
```shell
git clone git@github.com:pathikrit/chatgpt-cli.git
cd chatgpt-cli
yarn && node app.js
```

## [Demo][demo]
![demo][demo]

## Usage
```text
System commands:
  * clear / clr     : Clear chat history
  * copy / cp       : Copy last message to clipboard
  * history / h     : Show current history
  * export          : Save current chat history as ChatML doc
  * speak / say     : Speak out last response
  * help / ?        : Show this message
  * exit / quit / q : Exit the program

Usage Tips:
  - For multiline chats press PageDown
  - Use Up/Down array keys to scrub through previous messages  
  - Include [web] anywhere in your prompt to force web browsing
  - Include [img] anywhere in your prompt to generate an image
  - Enter a local path or url, to ingest text from it and add to context
  - Use TAB to do path completions when entering file (or folder path)
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
```
> Whats the weather like in nyc today?
⚠ I do not have real-time information. Please check a weather website or app for the current weather in NYC.
⠸ Searching the web ...
✔ As of April 19, 2023, the weather in New York City today is cloudy with a temperature of 67°F (19.4°C).
```

You can also force web browsing by including `[web]` anywhere in your prompt.

## Chatting with documents
Give a file path or folder (hit tab to autocomplete paths):
```
> ~/Downloads/Principles by Ray Dalio.pdf
✔ Ingested ~/Downloads/Principles by Ray Dalio.pdf. Here's a summary of first 10 pages:
Ray Dalio's book, Principles, is divided into three parts. 
Part 1 explains the purpose and importance of having principles in general. 
Part 2 explains Ray's most fundamental life principles. 
Part 3 explains Ray's management principles and how they are being applied at Bridgewater. 
Ray encourages readers to think for themselves and make clear-headed decisions in order to get what they want.
────────────────────────────────────────────────────────────────────────────────────
> What's the top management principle?
✔ Based on the snippets provided, it seems that Ray Dalio's management principles emphasize the importance of clear communication, delineation of responsibilities, logic and reason in decision-making, constant feedback and discussion, matching the right people to the job, synthesizing and connecting the dots, and a problem-solving approach. 
────────────────────────────────────────────────────────────────────────────────────
```

### Chat with webpages
```
> https://www.nytimes.com/2023/04/14/opinion/china-america-relationship.html
✔ Ingested https://www.nytimes.com/2023/04/14/opinion/china-america-relationship.html. Here's a summary of first 10 pages:
This article discusses the relationship between the United States and China, and how a trip to Beijing and Taiwan showed the author how the two countries are both fated to cooperate and doomed to compete.
───────────────────────────────
```

[demo]: https://vhs.charm.sh/vhs-3QhGaO2lbGeWk1kj8FrpKD.gif
