import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
import readline from 'readline'
import ora from 'ora'
import cliMd from 'cli-markdown'
import {google as googleapis} from 'googleapis'
const google = googleapis.customsearch('v1').cse

dotenv.config()

const config = {
  intro: [
    'Available commands:',
    ' * clear / clr: Clear chat history',
    ' * exit / quit / q: Exit the program'
  ],
  chatApiParams: {
    model: 'gpt-3.5-turbo',
    max_tokens: 2048,
  },
  systemPrompts: [
    'Always use code blocks with the appropriate language tags',
    'If the question needs real-time information that you may not have access to, simply reply with "I do not have real-time information"'
  ],
  needWebBrowsing: [
    'not have access to real-time',
    "don't access to real-time",
    'not able to provide real-time',
    'not have real-time',
    'as of my training data',
  ],
  googleSearchAuth: {
    auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  }
}

const newHistory = () => config.systemPrompts.map(prompt => {return {role: 'system', content: prompt}})

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
let history = newHistory()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    const completions = ['clear', 'exit', 'quit']
    const hits = completions.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : completions, line]
  }
})

const prompt = () => {
  rl.resume()
  console.log('────────────────────────────────────────────────────────────────────────────────────')
  rl.prompt()
}

const googleSearch = (query) => google
  .list(Object.assign(config.googleSearchAuth, {q: query}))
  .then(response => response.data.items.filter(result => result.snippet).map(result => result.snippet))
  .then(results => results.length ? Promise.resolve(results.join('\n')) : Promise.reject('No search result found'))

const needWebBrowsing = (response) => config.needWebBrowsing.some(frag => response.toLowerCase().includes(frag))

config.intro.forEach(line => console.log(line))
prompt()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case '': return prompt()
    case 'q': case 'quit': case 'exit':
      console.log('Bye!')
      process.exit()

    case 'clr': case 'clear':
      history = newHistory()
      console.log('Chat history cleared!')
      return prompt()

    default:
      rl.pause()

      const chat = (params) => {
        const spinner = ora().start(params.spinnerMessage)
        history.push({role: 'user', content: params.message})
        return openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history}))
          .then(res => {
            spinner.stop()
            const message = res.data.choices[0].message
            const output = message.content.includes('```') ? cliMd(message.content).trim() : message.content
            return Promise.resolve(console.log(output))
          })
          .catch(err => spinner.fail(err.stack))
          .finally(prompt)
      }

      chat({
        message: line,
        spinnerMessage: `Asking ${config.chatApiParams.model}`
      })

          // if (needWebBrowsing(res.data.choices[0].message.content)) {
          //   return googleSearch(line)
          //     //.then(text => chat(`I found the following web search results for "${line}":\n\n${text}\n\nUsing the above search results, can you now take a best guess at answering ${line}`))
          //     .then(text => Promise.resolve(console.log(text)))

  }
})

/* TODO
1. Streaming
2. Internet browsing
3. PDF
 */
