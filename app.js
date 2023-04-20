// Config stuff
import dotenv from 'dotenv'
dotenv.config()

// file system stuff
import * as fs from 'fs';
import untildify from 'untildify'

// I/O stuff
import readline from 'readline'

// Terminal UX stuff e.g. markdown, images, speech, clipboard etc
import ora from 'ora'                       // Show spinners in terminal
import chalk from 'chalk'                   // Terminal font colors
import cliMd from 'cli-markdown'            // Show markdown in terminals
import terminalImage from 'terminal-image'  // Show images in terminals
import clipboard from 'clipboardy'          // Terminal clipboard support
import say from 'say'                       // Text to speech for terminals

// Web
import {google} from 'googleapis'
import got from 'got'

// GPT stuff
import {Configuration as OpenAIConfig, OpenAIApi, ChatCompletionRequestMessageRoleEnum as Role} from 'openai'
import {encode} from 'gpt-3-encoder'

// langchain stuff
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'

const config = {
  chatApiParams: {
    model: 'gpt-3.5-turbo', //Note: When you change this, you may also need to change the gpt-3-encoder library
    max_tokens: 2048,
    temperature: 0.5
  },
  imageApiParams: {},
  terminalImageParams: {width: '50%', height: '50%'},
  textSplitter: {chunkSize: 200, chunkOverlap: 20},
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
  chatWithDoc: (query, docs) =>
`I was asked the following query: ${query}
  
Some relevant snippets from documents that I have that you may find useful in the context of my query:  
  
  ${docs.map(doc => doc.pageContent).join('\n')}

Answer to best of your abilities the original query`,
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
  - If you just enter a file or folder path, we will ingest text from it and add to context
`,
    onExit: chalk.italic('Bye!'),
    onClear: chalk.italic('Chat history cleared!'),
    onSearch: chalk.italic(`Searching the web`),
    searchInfo: chalk.italic('(inferred from Google search)'),
    onQuery: chalk.italic(`Asking ${config.chatApiParams.model}`),
    onImage: chalk.italic(`Generating image`),
    onDoc: (file, finish) => chalk.italic(finish ? `Ingested ${file}` : `Ingesting ${file}`),
    onCopy: (text) => chalk.italic(`Copied last message to clipboard (${text.length} characters)`)
  }
}

const systemCommands = prompts.info.help.split(/\r?\n/)
  .filter(s => s.trim().startsWith('*'))
  .flatMap(s => s.split(':')[0].split(' '))
  .map(s => s.trim())
  .filter(s => s.length > 3)

if (!config.openAiApiKey) {
  console.error(prompts.errors.missingOpenAiApiKey)
  process.exit(-1)
}

class DocChat {
  static embeddings = new OpenAIEmbeddings({openAIApiKey: config.openAiApiKey})
  static textSplitter = new RecursiveCharacterTextSplitter(config.textSplitter)

  static isSupported = (file) => {
    file = untildify(file)
    // TODO: support directories
    // TODO: support other file types like .txt and Word docs
    return fs.existsSync(file) && file.endsWith('.pdf')
  }

  static toText = (file) => {
    file = untildify(file)
    if (!fs.existsSync(file)) return Promise.reject(`Missing file: ${file}`)
    if (file.endsWith('.pdf')) return new PDFLoader(file).load()
    return Promise.reject('Unsupported file type')
  }

  constructor() {
    this.clear()
  }

  add = (file) => DocChat.toText(file)
    .then(docs =>  DocChat.textSplitter.splitDocuments(docs))
    .then(docs => this.vectorStore.addDocuments(docs))
    .then(_ => this.hasDocs = true)

  clear = () => {
    this.vectorStore = new MemoryVectorStore(DocChat.embeddings)
    this.hasDocs = false
  }

  //TODO: add summarization

  query = (query) => this.vectorStore.similaritySearch(query, Math.floor(config.chatApiParams.max_tokens/config.textSplitter.chunkSize))
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
const docChat = new DocChat()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    // TODO: Auto complete file paths
    const hits = systemCommands.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : systemCommands, line]
  }
})
// TODO: True multiline support e.g. pasting (Blocked by https://stackoverflow.com/questions/66604677/)
process.stdin.on('keypress', (letter, key)=> {
  if (key?.name === 'pagedown') {
    rl.write(' ')
    process.stdout.write('\n')
  }
})

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
    case '': {
      return prompts.next()
    }
    case 'q': case 'quit': case 'exit': {
      console.log(prompts.info.onExit)
      process.exit()
    }
    case '?': case 'help': {
      console.log(prompts.info.help)
      return prompts.next()
    }
    case 'clr': case 'clear': {
      history.clear()
      docChat.clear()
      console.log(prompts.info.onClear)
      return prompts.next()
    }
    case 'h': case 'history': {
      history.show()
      return prompts.next()
    }
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
    default: {
      rl.pause()
      let spinner = ora().start()
      const chat = (params) => {
        const promptEngineer = () => {
          if (params.message.includes(prompts.webBrowsing.forcePhrase)) {
            spinner.text = prompts.info.onSearch
            params.message = params.message.replace(prompts.webBrowsing.forcePhrase, ' ').trim()
            return googleSearch(params.message).then(result => prompts.webBrowsing.preFacto(params.message, result))
          } else if (docChat.hasDocs) {
            return docChat.query(params.message).then(docs => docs.length ? prompts.chatWithDoc(params.message, docs) : params.message)
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

      const consumeDoc = (file) => {
        spinner.text = prompts.info.onDoc(file, false)
        return docChat.add(file).then(_ => spinner.succeed(prompts.info.onDoc(file, true)))
      }

      let task = undefined
      if (line.includes('[img]')) task = genImage()
      else if (DocChat.isSupported(line)) task = consumeDoc(line)
      else task = chat({message: line})

      return task.catch(err => spinner.fail(err.stack ?? err.message ?? err)).finally(prompts.next)
    }
  }
})
