ChatGPT CLI
---
This is a tiny ([<500 LoC](app.js)) toy program written in node.js to run ChatGPT in your terminal that supports:
- [web-browsing](#web-browsing)
- text-to-speech (enter `speak`)
- image-generation (add `[img]` anywhere in prompt)
- chat history (enter `h`)
- auto-completions (hit `TAB`)
- [document chatting & summarization](#chatting-with-documents) 

## Setup

1. Install `yarn` and `node` e.g. using `brew`:
```shell
brew install node yarn
```

2. Start the app:
```shell
export OPENAI_API_KEY=XXXXXXXX # Get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

## [Demo](https://vhs.charm.sh/vhs-4LWWn2aGy7cg8HC9TW4hLo.gif)
![VHS](https://vhs.charm.sh/vhs-4LWWn2aGy7cg8HC9TW4hLo.gif)

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