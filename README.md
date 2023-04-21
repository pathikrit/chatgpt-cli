ChatGPT CLI
---
This is a tiny ([<500 LoC](app.js)) toy program written in node.js to run ChatGPT in your terminal that supports [web-browsing](#web-browsing), text-to-speech, image-generation, chat history, auto-completions, [document chatting](#chatting-with-documents) etc.

1. Install `yarn` and `node` e.g. using `brew`:
```shell
brew install node yarn
```

2. Start the app:
```shell
export OPENAI_API_KEY=XXXXXXXX # Get from https://platform.openai.com/account/api-keys
yarn && node app.js
```

<img src='demo/demo.gif' style="width:1200px; height:900px;"/>

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
Give file path or folder:
```
> ~/Downloads/Principles by Ray Dalio.pdf
✔ Ingested ~/Downloads/Principles by Ray Dalio.pdf
────────────────────────────────────────────────────────────────────────────────────
> What's the top management principle?
✔ Based on the snippets provided, it seems that Ray Dalio's management principles emphasize the importance of clear communication, delineation of responsibilities, logic and reason in decision-making, constant feedback and discussion, matching the right people to the job, synthesizing and connecting the dots, and a problem-solving approach. 
────────────────────────────────────────────────────────────────────────────────────
```