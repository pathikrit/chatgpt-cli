require('dotenv').config()
const { Configuration, OpenAIApi } = require('openai')
const readline = require('readline')

const openai = new OpenAIApi(new Configuration({apiKey: process.env.OPENAI_API_KEY}))

const rl = readline.createInterface({input: process.stdin, output: process.stdout, terminal: false})

let history = []

rl.setPrompt('> ')

const prompt = () => {
  console.log('────────────────────────────────────────────────────────────────────────────────────')
  rl.prompt()
}

console.log('Available commands:\n' +
  '1. clear: Clears chat history\n' +
  '2. exit: Exits the program\n')
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
      openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: history,
        max_tokens: 2048,
      }).then(res => {
        res.data.choices.forEach(choice => {
          history.push(choice.message)
          console.log(choice.message.content)
        })
        rl.resume()
        prompt()
      })
  }
})
