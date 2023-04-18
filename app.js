import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
import readline from 'readline'
import ora from 'ora'
import cliMd from 'cli-markdown'

dotenv.config()

const config = {
  intro: [
    'Available commands:',
    ' * clear: Clears chat history',
    ' * exit: Exits the program'
  ],
  chatApiParams: {
    model: 'gpt-3.5-turbo',
    max_tokens: 2048,
  },
  systemPrompt: [{role: 'system', content: 'Always use code blocks with the appropriate language tags'}]
}

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
let history = config.systemPrompt

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    const completions = ['clear', 'exit']
    const hits = completions.filter(c => c.startsWith(line.toLowerCase()))
    return [hits.length ? hits : completions, line]
  }
})

const prompt = () => {
  rl.resume()
  console.log('────────────────────────────────────────────────────────────────────────────────────')
  rl.prompt()
}

config.intro.forEach(line => console.log(line))
prompt()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case '': return
    case 'exit': process.exit()

    case 'clear':
      history = config.systemPrompt
      console.log('Chat history is now cleared!')
      prompt()
      return

    default:
      rl.pause()
      history.push({role: 'user', content: line})
      const spinner = ora().start('Fetching')
      openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history}))
        .then(res => {
          spinner.stop()
          res.data.choices.forEach(choice => {
            history.push(choice.message)
            console.log(cliMd(choice.message.content).trim())
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
