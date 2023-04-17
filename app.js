require('dotenv').config()
const { Configuration, OpenAIApi } = require('openai')
const readline = require('readline')

const config = {
  intro: [
    'Available commands:',
    ' 1. clear: Clears chat history',
    ' 2. exit: Exits the program'
  ],
  chatApiParams: {
    model: 'gpt-3.5-turbo',
    max_tokens: 2048,
  }
}

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))
let history = []

const rl = readline.createInterface({input: process.stdin, output: process.stdout, terminal: false})
rl.setPrompt('> ')
const prompt = () => {
  rl.resume()
  console.log('────────────────────────────────────────────────────────────────────────────────────')
  rl.prompt()
}

config.intro.forEach(line => console.log(line))
prompt()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case 'clear':
      history = []
      console.log('Chat history is now cleared!')
      prompt()
      return
    case 'exit':
      process.exit()
    case '':
      return
    default:
      rl.pause()
      history.push({role: 'user', content: line})
      openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history}))
        .then(res => {
          res.data.choices.forEach(choice => {
            history.push(choice.message)
            console.log(choice.message.content)
          })
        })
        .catch(err => console.error(err))
        .finally(prompt)
  }
})
