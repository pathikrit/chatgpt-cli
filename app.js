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
  systemPrompt: [{
    role: 'system',
    content: 'Always use code blocks with the appropriate language tags. If the question needs real-time information that you may not have, simply reply with "Check Internet"'
  }]
}

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
let history = Array.from(config.systemPrompt)

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

config.intro.forEach(line => console.log(line))
prompt()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case '': return prompt()
    case 'q':
    case 'quit':
    case 'exit': process.exit()

    case 'clear':
      history = Array.from(config.systemPrompt)
      console.log('Chat history is now cleared!')
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
