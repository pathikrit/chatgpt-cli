#!/usr/bin/env node

// Config stuff
import dotenv from 'dotenv'
dotenv.config()

// file system stuff
import * as fs from 'fs';
import untildify from 'untildify'
import downloadsFolder from 'downloads-folder'

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
import { google } from 'googleapis'
import got from 'got'
import { URL } from 'url'

// GPT stuff
// TODO: Move to langchain client and prompt templates
// TODO: streaming + cancellation
import { Configuration as OpenAIConfig, OpenAIApi, ChatCompletionRequestMessageRoleEnum as Role } from 'openai'
import { encode } from 'gpt-3-encoder'

// langchain stuff
import { OpenAI } from 'langchain/llms/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { loadSummarizationChain, AnalyzeDocumentChain } from 'langchain/chains'

// Document loaders
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import { PlaywrightWebBaseLoader } from 'langchain/document_loaders/web/playwright'

const config = {
  chatApiParams: {
    model: 'gpt-3.5-turbo', //Note: When you change this, you may also need to change the gpt-3-encoder library
    max_tokens: 2048,
    temperature: 0.5
  },
  summaryPages: 10,
  downloadsFolder: downloadsFolder(),
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
    console.log('───────────────────────────────')
    rl.prompt()
  },
  system: [
    'Always use code blocks with the appropriate language tags',
    'If the answer may have changed since your cut-off date, simply reply with "I do not have real-time information" and nothing else'
  ],
  imagePhrase: '[img]',
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
    help: fs.readFileSync('README.md', 'utf-8').split('```text')[1].split('```')[0].trim(),
    exported: (file) => chalk.italic(`Saved chat history to ${file}`),
    onExit: chalk.italic('Bye!'),
    onClear: chalk.italic('Chat history cleared!'),
    onSearch: chalk.italic(`Searching the web`),
    searchInfo: chalk.italic('(inferred from Google search)'),
    onQuery: chalk.italic(`Asking ${config.chatApiParams.model}`),
    onImage: chalk.italic(`Generating image`),
    imageSaved: (file) => chalk.italic(`Image saved to ${file}`),
    onDoc: (file, finish) => chalk.italic(finish ? `Ingested ${file}. Here's a summary of first ${config.summaryPages} pages:` : `Ingesting ${file}`),
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

  static summarizer = new AnalyzeDocumentChain({combineDocumentsChain: loadSummarizationChain(new OpenAI({ temperature: 0 }))})

  static isSupported = (file) => DocChat.toText(file, true)

  static isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch (err) {
      return false
    }
  }

  static toText = (file, checkOnly = false) => {
    if (DocChat.isValidUrl(file)) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load()
    file = untildify(file)
    if (!fs.existsSync(file)) return checkOnly ? false : Promise.reject(`Missing file: ${file}`)
    // TODO: support directories
    // if (fs.lstatSync(file).isDirectory()) {
    //   const children = fs.readdirSync(file).filter(f => !fs.lstatSync(f).isDirectory())
    //   return checkOnly ? children.some(c => DocChat.toText(c, checkOnly)) : Promise.all(children.map(c => DocChat.toText))
    // }
    if (file.endsWith('.html')) return checkOnly ? true : new PlaywrightWebBaseLoader(file).load()
    if (file.endsWith('.pdf'))  return checkOnly ? true : new PDFLoader(file).load()
    if (file.endsWith('.docx')) return checkOnly ? true : new DocxLoader(file).load()
    if (file.endsWith('.text') || file.endsWith('.md')) return checkOnly ? true : new TextLoader(file).load()
    return checkOnly ? false : Promise.reject('Unsupported file type')
  }

  constructor() {
    this.clear()
  }

  add = (file) => DocChat.toText(file)
    .then(docs =>  DocChat.textSplitter.splitDocuments(docs))
    .then(docs => {
      this.vectorStore.addDocuments(docs)
      this.hasDocs = true
      const text = docs.slice(0, config.summaryPages).map(doc => doc.pageContent).join('')
      return DocChat.summarizer.call({input_document: text}).then(res => res.text.trim())
    })

  clear = () => {
    this.vectorStore = new MemoryVectorStore(DocChat.embeddings)
    this.hasDocs = false
  }

  query = (query) => this.vectorStore.similaritySearch(query, Math.floor(config.chatApiParams.max_tokens/config.textSplitter.chunkSize))
}

class History {
  constructor() {
    this.clear()
  }

  add = (message) => {
    // OpenAI recommends replacing newlines with spaces for best results
    if (message.role === Role.User) message.content = message.content.replace(/\s\s+/g, ' ').trim()
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
    // See: https://stackoverflow.com/questions/42197385/
    if (line.includes('/')) {
      const dir = line.substring(0, line.lastIndexOf('/') + 1)
      if (fs.existsSync(untildify(dir))) {
        const suffix = line.substring(line.lastIndexOf('/') + 1)
        const hits = fs.readdirSync(untildify(dir)).filter(file => file.startsWith(suffix)).map(file => dir + file)
        if (hits.length) return [hits, line]
      }
    }
    const hits = systemCommands.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : systemCommands, line]
  }
}).on('close', () => console.log(prompts.info.onExit))

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
    case '': return prompts.next()
    case 'q': case 'quit': case 'exit': return rl.close()
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
    case 'export': {
      const file = `${config.downloadsFolder}/${Date.now()}.chatml.json`
      fs.writeFileSync(file, JSON.stringify(history.get()))
      console.log(prompts.info.exported(file))
      return prompts.next()
    }
    // TODO case 'import': import saved history
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
              const output = cliMd(content).trim()
              if (needWebBrowsing) {
                spinner.warn(chalk.dim(output))
                spinner = ora().start(prompts.info.onSearch)
                //TODO: Ask gpt for a better query here
                return googleSearch(params.message).then(text => chat({message: prompts.webBrowsing.postFacto(line, text), nested: true}))
              }
              spinner.stop()
              return Promise.resolve(console.log(output))
            })
        }
        return promptEngineer().catch(_ => Promise.resolve(params.message)).then(makeRequest)
      }

      const genImage = (prompt) => {
        spinner.text = prompts.info.onImage
        return openai.createImage(Object.assign(config.imageApiParams, {prompt: prompt}))
          .then(response => got(response.data.data[0].url).buffer())
          .then(buffer => {
            const file = `${config.downloadsFolder}/${prompt.replace(/ /g,"_")}.jpg`
            fs.writeFileSync(file, buffer);
            spinner.succeed(prompts.info.imageSaved(file))
            return file
          })
          .then(file => terminalImage.file(file, config.terminalImageParams))
          .then(res => console.log(res))
      }

      const consumeDoc = (file) => {
        spinner.text = prompts.info.onDoc(file, false)
        return docChat.add(file).then(summary => {
          spinner.succeed(prompts.info.onDoc(file, true))
          console.log(summary)
        })
      }

      let task = undefined
      if (line.includes(prompts.imagePhrase)) task = genImage(line.replace(prompts.imagePhrase, '').trim())
      else if (DocChat.isSupported(line)) task = consumeDoc(line)
      else task = chat({message: line})

      return task.catch(err => spinner.fail(err.stack ?? err.message ?? err)).finally(prompts.next)
    }
  }
})
