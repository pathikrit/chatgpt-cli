import dotenv from 'dotenv'
import fs from 'fs'
import readline from 'readline'
import untildify from 'untildify'
import ora from 'ora'
import chalk from 'chalk'
import cliMd from 'cli-markdown'
import clipboard from 'clipboardy'
import { Configuration as OpenAIConfig, OpenAIApi, ChatCompletionRequestMessageRoleEnum as Role } from 'openai'
import {google} from 'googleapis'
import {readPdfText} from 'pdf-text-reader'
import {encode} from 'gpt-3-encoder'

dotenv.config()
const config = {
  chatApiParams: {
    model: 'gpt-3.5-turbo',
    max_tokens: 2048,
  },
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
    const completions = ['clear', 'exit', 'quit']
    const hits = completions.filter(c => c.startsWith(line.toLowerCase().trim()))
    return [hits.length ? hits : completions, line]
  },
  system: [
    'Always use code blocks with the appropriate language tags',
    'If the answer may have changed since your cut-off date, simply reply with "I do not have real-time information" and nothing else'
  ],
  needWebBrowsing: [
    'not have access to real-time',
    "don't access to real-time",
    'not able to provide real-time',
    'not have real-time',
    'as of my training data',
    "as of september 2021",
    "as of my programmed cut-off date"
  ],
  webSearch: (query, result) =>
    `Okay, I found the following up-to-date web search results for "${query}":
    
      ${result}
      
    Using the above search results, can you now take a best guess at answering ${query}. 
    Exclude the disclaimer note about this information might be inaccurate or subject to change. 
    Be short and don't say "based on the search results".`,
  chatWithDoc: (text) => `
    This is some text I extracted from a file:
    
    ${text}
    
    I would ask more questions about this later. Can you respond with a short 3 sentence summary in markdown bullets form?
  `,
  errors: {
    missingOpenAiApiKey: chalk.redBright('OPENAI_API_KEY must be set (see https://platform.openai.com/account/api-keys).'),
    missingGoogleKey: 'Cannot search the web since GOOGLE_CUSTOM_SEARCH_CONFIGs are not set',
    noResults: 'No search result found',
    nothingToCopy: 'History is empty; nothing to copy'
  },
  info: {
    help: `Available commands:
    * clear / clr     : Clear chat history
    * copy / cp       : Copy last message to clipboard
    * help / h        : Show this message
    * exit / quit / q : Exit the program
    
    - For multiline chats press PageDown
    - Use Up/Down array keys to travel through history
    `,
    onExit: chalk.italic('Bye!'),
    onClear: chalk.italic('Chat history cleared!'),
    onSearch: chalk.italic(`Searching the web`),
    searchInfo: chalk.italic('(inferred from Google search)'),
    onQuery: chalk.italic(`Asking ${config.chatApiParams.model}`),
    docQuery: (file) => chalk.italic(`Asking ${config.chatApiParams.model} about ${file}`),
    onCopy: (text) => chalk.italic(`Copied last message to clipboard (${text.length} characters)`)
  }
}

if (!config.openAiApiKey) {
  console.error(prompts.errors.missingOpenAiApiKey)
  process.exit(-1)
}
const openai = new OpenAIApi(new OpenAIConfig({apiKey: config.openAiApiKey}))

const newHistory = () => prompts.system.map(prompt => {return {role: Role.System, content: prompt}})
let history = newHistory()

const rl = readline.createInterface({input: process.stdin, output: process.stdout, completer: prompts.completer})
// TODO: Hack to get around https://stackoverflow.com/questions/66604677/
const newLinePlaceholder = '\u2008'
process.stdin.on('keypress', (letter, key)=> {
  if (key?.name === 'pagedown') {
    rl.write(newLinePlaceholder)
    process.stdout.write('\n')
  }
})

const docToText = (file) => {
  file = untildify(file)
  if (fs.existsSync(file)) {
    if (file.endsWith('.pdf')) return readPdfText(file).then(pages => pages.map(page => page.lines).join('\n\n'))
    // TODO: support other file types like .txt and Word docs
  }
  return Promise.resolve()
}

const googleSearch = (query) => config.googleSearchAuth.auth && config.googleSearchAuth.cx ?
  google.customsearch('v1').cse
    .list(Object.assign(config.googleSearchAuth, {q: query}))
    .then(response => response.data.items.filter(result => result.snippet).map(result => result.snippet))
    .then(results => results.length ? Promise.resolve(results.join('\n')) : Promise.reject(prompts.errors.noResults))
  : Promise.reject(prompts.errors.missingGoogleKey)

console.log(prompts.info.help)
prompts.next()

rl.on('line', (line) => {
  switch (line.toLowerCase().trim()) {
    case '': return prompts.next()
    case 'q': case 'quit': case 'exit':
      console.log(prompts.info.onExit)
      process.exit()

    case 'h': case 'help':
      console.log(prompts.info.help)
      return prompts.next()

    case 'clr': case 'clear':
      history = newHistory()
      console.log(prompts.info.onClear)
      return prompts.next()

    case 'cp': case 'copy':
      const content = history.findLast(item => item.role === Role.Assistant)?.content
      if (content) {
        clipboard.writeSync(content)
        console.log(prompts.info.onCopy(content))
      } else console.warn(prompts.errors.nothingToCopy)
      return prompts.next()

    default:
      rl.pause()
      const handleError = (spinner, err) => spinner.fail(err.stack ?? err.message ?? err)
      const chat = (params) => {
        const spinner = params.spinner ?? ora().start()
        spinner.text = prompts.info.onQuery
        history.push({role: Role.User, content: params.message})
        return openai.createChatCompletion(Object.assign(config.chatApiParams, {messages: history}))
          .then(res => {
            const message = res.data.choices[0].message
            history.push(message)
            const content = message.content
            const needWebBrowsing = !params.nested && prompts.needWebBrowsing.some(frag => content.toLowerCase().includes(frag))
            const output = content.includes('```') ? cliMd(content).trim() : chalk.bold(content) //TODO: better logic of whether output is in markdown
            if (needWebBrowsing) {
              spinner.warn(chalk.dim(output))
              const webSpinner = ora().start(prompts.info.onSearch)
              return googleSearch(params.message)
                .then(text => chat({message: prompts.webSearch(line, text), nested: true, spinner: webSpinner}))
                .catch(err => handleError(webSpinner, err))
            }
            return Promise.resolve(spinner.succeed(output))
          })
          .catch(err => handleError(spinner, err))
      }
      return chat({message: line.replace(newLinePlaceholder, '\n').trim()}).finally(prompts.next)
  }
})

/* TODO
- PDF
- Truncate history
- Image rendering
- Force internet search
- Gif of terminal
*/
