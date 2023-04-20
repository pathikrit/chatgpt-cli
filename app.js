// Config stuff
import dotenv from 'dotenv'
dotenv.config()

// I/O stuff
import readline from 'readline'

// Terminal font stuff
import ora from 'ora'
import chalk from 'chalk'

// Terminal presentation stuff e.g. markdown, images, speech, clipboard etc
import cliMd from 'cli-markdown'
import terminalImage from 'terminal-image'
import clipboard from 'clipboardy'
import say from 'say'

// Web
import {google} from 'googleapis'
import got from 'got'

// Doc chat stuff
import untildify from 'untildify'
import flexsearch from 'flexsearch'
import {readPdfText} from 'pdf-text-reader'

// GPT stuff
import {Configuration as OpenAIConfig, OpenAIApi, ChatCompletionRequestMessageRoleEnum as Role} from 'openai'
import {encode} from 'gpt-3-encoder'

const config = {
  chatApiParams: {
    model: 'gpt-3.5-turbo', //Note: When you change this, you may also need to change the gpt-3-encoder library
    max_tokens: 2048,
    temperature: 0.5
  },
  imageApiParams: {},
  terminalImageParams: {width: '50%', height: '50%'},
  googleSearchAuth: {
    auth: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
  },
  openAiApiKey: process.env.OPENAI_API_KEY
}

const prompts = {
  next: () => {
    rl.resume()
    console.log('────────────────────────────────────────────────────────────────────────────────────')
    rl.prompt()
  },
  completer: (line) => {
    const completions = ['clear', 'copy', 'help', 'exit', 'quit']
    const hits = completions.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : completions, line]
  },
  system: [
    'Always use code blocks with the appropriate language tags',
    'If the answer may have changed since your cut-off date, simply reply with "I do not have real-time information" and nothing else'
  ],
  webBrowsing: {
    needed: [
      "not have access to real-time",
      "don't have access to real-time",
      "don't have real-time",
      "not able to provide real-time",
      "not have real-time",
      "as of my training data",
      "as of september 2021",
      "as of my programmed cut-off date"
    ],
    forcePhrase: '[web]',
/***********************************************************************************************************************/
    preFacto: (query, result) => 
`Can you answer "${query}"?
I also found the following web search results for the same query:

  ${result}

If needed, feel free to augment your response with anything helpful from the above search results too.
`,
/***********************************************************************************************************************/
    postFacto: (query, result) => 
`I found the following up-to-date web search results for "${query}":

  ${result}

Using the above search results, can you now take a best guess at answering ${query}. 
Exclude the disclaimer note about this information might be inaccurate or subject to change.
Be short and don't say "based on the search results". 
Btw, the date and time right now is ${new Date().toLocaleString()}. Feel free to mention that in your response if needed.`
  },
/***********************************************************************************************************************/
  chatWithDoc: (text) => 
`This is some text I extracted from a file:
  
  ${text}

I would ask more questions about this later. Can you respond with a short 3 sentence summary in markdown bullets form?`,
/***********************************************************************************************************************/
  errors: {
    missingOpenAiApiKey: chalk.redBright('OPENAI_API_KEY must be set (see https://platform.openai.com/account/api-keys).'),
    missingGoogleKey: 'Cannot search the web since GOOGLE_CUSTOM_SEARCH_CONFIGs are not set',
    noResults: 'No search result found',
    nothingToCopy: 'History is empty; nothing to copy',
    nothingToSay: 'No messages yet; nothing to say'
  },
  info: {
    help:
`System commands:
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
  - Include [img] anywhere in your prompt to generate an image (works best in iTerm which can display images)
`,
    onExit: chalk.italic('Bye!'),
    onClear: chalk.italic('Chat history cleared!'),
    onSearch: chalk.italic(`Searching the web`),
    searchInfo: chalk.italic('(inferred from Google search)'),
    onQuery: chalk.italic(`Asking ${config.chatApiParams.model}`),
    onImage: chalk.italic(`Generating image`),
    docQuery: (file) => chalk.italic(`Asking ${config.chatApiParams.model} about ${file}`),
    onCopy: (text) => chalk.italic(`Copied last message to clipboard (${text.length} characters)`)
  }
}

if (!config.openAiApiKey) {
  console.error(prompts.errors.missingOpenAiApiKey)
  process.exit(-1)
}

class History {
  constructor() {
    this.clear()
  }

  add = (message) => {
    // OpenAI recommends replacing newlines with spaces for best results
    message.content = message.content.replace(/\s\s+/g, ' ').trim()
    message.numTokens = encode(message.content).length
    this.history.push(message)
    while (this.totalTokens() > config.chatApiParams.max_tokens) {
      const idx = this.history.findIndex(msg => msg.role !== Role.System)
      if (idx < 0) break
      this.history.splice(idx, 1)
    }
  }

  totalTokens = () => this.history.map(msg => msg.numTokens).reduce((a, b) => a + b, 0)

  clear = () => {
    this.history = []
    prompts.system.map(prompt => this.add({role: Role.System, content: prompt}))
  }

  get = () => this.history.map(msg => ({role: msg.role, content: msg.content}))

  lastMessage = () => this.history.findLast(item => item.role === Role.Assistant)

  show = () => console.log(this.history)
}

const openai = new OpenAIApi(new OpenAIConfig({apiKey: config.openAiApiKey}))
const history = new History()

const rl = readline.createInterface({input: process.stdin, output: process.stdout, completer: prompts.completer})
// TODO: True multiline support e.g. pasting (Blocked by https://stackoverflow.com/questions/66604677/)
process.stdin.on('keypress', (letter, key)=> {
  if (key?.name === 'pagedown') {
    rl.write(' ')
    process.stdout.write('\n')
  }
})

// TODO:
// class DocChat {
//   constructor(file) {
//     file = untildify(file)
//     // TODO: support other file types like .txt and Word docs
//     if (file.endsWith('.pdf')) {
//       const index = new flexsearch.Index()
//       this.indexing = readPdfText(file)
//         .then(pages => pages.forEach((page, i) => index.add(i, page.lines.join('\n'))))
//         .then(_ => index)
//     }
//   }
//
//   query = (q, n = 3) => this.indexing.then(index => index.search(q, n))
// }
//
// const docChat = new DocChat('~/Downloads/48laws.pdf')
// docChat.query('Use Bait?')
//   .then(res => console.log(res))

const googleSearch = (query) => config.googleSearchAuth.auth && config.googleSearchAuth.cx ?
  google.customsearch('v1').cse
    .list(Object.assign(config.googleSearchAuth, {q: query}))
    .then(response => response.data.items.filter(result => result.snippet).map(result => result.snippet))
    .then(results => results.length ? Promise.resolve(results.join('\n')) : Promise.reject(prompts.errors.noResults))
  : Promise.reject(prompts.errors.missingGoogleKey)

console.log(prompts.info.help)
prompts.next()

rl.on('line', (line) => {
  say.stop()
  switch (line.toLowerCase().trim()) {
    case '': return prompts.next()

    case 'q': case 'quit': case 'exit':
      console.log(prompts.info.onExit)
      process.exit()

    case '?': case 'help':
      console.log(prompts.info.help)
      return prompts.next()

    case 'clr': case 'clear':
      history.clear()
      console.log(prompts.info.onClear)
      return prompts.next()

    case 'h': case 'history':
      history.show()
      return prompts.next()

    case 'say': case 'speak': {
      const content = history.lastMessage()?.content
      if (content) say.speak(content)
      else console.warn(prompts.errors.nothingToSay)
      return prompts.next()
    }

    case 'cp': case 'copy': {
      const content = history.lastMessage()?.content
      if (content) {
        clipboard.writeSync(content)
        console.log(prompts.info.onCopy(content))
      } else console.warn(prompts.errors.nothingToCopy)
      return prompts.next()
    }

    default:
      rl.pause()
      let spinner = ora().start()
      const chat = (params) => {
        const promptEngineer = () => {
          if (params.message.includes(prompts.webBrowsing.forcePhrase)) {
            spinner.text = prompts.info.onSearch
            params.message = params.message.replace(prompts.webBrowsing.forcePhrase, ' ').trim()
            return googleSearch(params.message).then(result => prompts.webBrowsing.preFacto(params.message, result))
          } else {
            return Promise.resolve(params.message)
          }
        }
        const makeRequest = (prompt) => {
          spinner.text = prompts.info.onQuery
          history.add({role: Role.User, content: prompt})
          return openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history.get()}))
            .then(res => {
              const message = res.data.choices[0].message
              history.add(message)
              const content = message.content
              const needWebBrowsing = !params.nested && prompts.webBrowsing.needed.some(frag => content.toLowerCase().includes(frag))
              const output = content.includes('```') ? cliMd(content).trim() : chalk.bold(content) //TODO: better logic of whether output is in markdown
              if (needWebBrowsing) {
                spinner.warn(chalk.dim(output))
                spinner = ora().start(prompts.info.onSearch)
                //TODO: Ask gpt for a better query here
                return googleSearch(params.message).then(text => chat({message: prompts.webBrowsing.postFacto(line, text), nested: true}))
              }
              return Promise.resolve(spinner.succeed(output))
            })
        }
        return promptEngineer().catch(_ => Promise.resolve(params.message)).then(makeRequest)
      }

      const genImage = () => {
        spinner.text = prompts.info.onImage
        return openai.createImage(Object.assign(config.imageApiParams, {prompt: line}))
          .then(response => got(response.data.data[0].url).buffer())
          .then(body => terminalImage.buffer(body, config.terminalImageParams))
          .then(res => spinner.succeed('\n' + res))
      }

      const task = line.includes('[img]') ? genImage() : chat({message: line})

      return task.catch(err => spinner.fail(err.stack ?? err.message ?? err)).finally(prompts.next)
  }
})
