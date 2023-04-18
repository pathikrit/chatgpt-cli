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
    {
      role: 'system',
      content: 'Always use code blocks with the appropriate language tags.'
    },
    {
      role: 'system',
      content: 'If the question needs real-time information that you may not have access to, simply reply with "Check Internet"'
    }
  ],
  googleSearchAuth: {
    auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  }
}

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
let history = Array.from(config.systemPrompts)

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

const needWebBrowsing = (response) => {
  const res = response.toLowerCase()
  return res === 'Check Internet' || res.includes('do not have real-time information') || res.includes('as of my training data')
}

config.intro.forEach(line => console.log(line))
prompt()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case '': return prompt()
    case 'q': case 'quit': case 'exit':
      console.log('Bye!')
      process.exit()

    case 'clr': case 'clear':
      history = Array.from(config.systemPrompts)
      console.log('Chat history cleared!')
      return prompt()

    default:
      rl.pause()
      history.push({role: 'user', content: line})
      const spinner = ora().start(`Asking ${config.chatApiParams.model}`)
      openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history}))
        .then(res => {
          spinner.stop()
          res.data.choices.forEach(choice => {
            history.push(choice.message)
            const output = choice.message.content.includes('```') ? cliMd(choice.message.content).trim() : choice.message.content
            console.log(output)
          })
        })
        .catch(err => spinner.fail(err.message))
        .finally(prompt)
  }
})

/* TODO
1. Streaming
2. Internet browsing
3. PDF
 */
