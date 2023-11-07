import _ from 'lodash'
/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import Environments from './snippets/Environments'
let staticSnippets = Array.from(Environments.withoutSnippets).map(env => ({
  caption: `\\begin{${env}}...`,
  snippet: `\
\\begin{${env}}
\t$1
\\end{${env}}\
`,
  meta: 'env',
}))

staticSnippets = staticSnippets.concat([
  {
    caption: '\\begin{array}...',
    snippet: `\
\\begin{array}{\${1:cc}}
\t$2 & $3 \\\\\\\\
\t$4 & $5
\\end{array}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{figure}...',
    snippet: `\
\\begin{figure}
\t\\centering
\t\\includegraphics{$1}
\t\\caption{\${2:Caption}}
\t\\label{\${3:fig:my_label}}
\\end{figure}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{tabular}...',
    snippet: `\
\\begin{tabular}{\${1:c|c}}
\t$2 & $3 \\\\\\\\
\t$4 & $5
\\end{tabular}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{table}...',
    snippet: `\
\\begin{table}[$1]
\t\\centering
\t\\begin{tabular}{\${2:c|c}}
\t\t$3 & $4 \\\\\\\\
\t\t$5 & $6
\t\\end{tabular}
\t\\caption{\${7:Caption}}
\t\\label{\${8:tab:my_label}}
\\end{table}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{list}...',
    snippet: `\
\\begin{list}
\t\\item $1
\\end{list}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{enumerate}...',
    snippet: `\
\\begin{enumerate}
\t\\item $1
\\end{enumerate}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{itemize}...',
    snippet: `\
\\begin{itemize}
\t\\item $1
\\end{itemize}\
`,
    meta: 'env',
  },
  {
    caption: '\\begin{frame}...',
    snippet: `\
\\begin{frame}{\${1:Frame Title}}
\t$2
\\end{frame}\
`,
    meta: 'env',
  },
])

const documentSnippet = {
  caption: '\\begin{document}...',
  snippet: `\
\\begin{document}
$1
\\end{document}\
`,
  meta: 'env',
}

const bibliographySnippet = {
  caption: '\\begin{thebibliography}...',
  snippet: `\
\\begin{thebibliography}{$1}
\\bibitem{$2}
$3
\\end{thebibliography}\
`,
  meta: 'env',
}
staticSnippets.push(documentSnippet)

const parseCustomEnvironments = function (text) {
  let match
  const re = /^\\newenvironment{(\w+)}.*$/gm
  const result = []
  let iterations = 0
  while ((match = re.exec(text))) {
    result.push({ name: match[1], whitespace: null })
    iterations += 1
    if (iterations >= 1000) {
      return result
    }
  }
  return result
}

const parseBeginCommands = function (text) {
  let match
  const re = /^([\t ]*)\\begin{(\w+)}.*\n([\t ]*)/gm
  const result = []
  let iterations = 0
  while ((match = re.exec(text))) {
    const whitespaceAlignment = match[3].replace(match[1] || '', '')
    if (
      !Array.from(Environments.all).includes(match[2]) &&
      match[2] !== 'document'
    ) {
      result.push({ name: match[2], whitespace: whitespaceAlignment })
      iterations += 1
      if (iterations >= 1000) {
        return result
      }
    }
    re.lastIndex = match.index + 1
  }
  return result
}

const hasDocumentEnvironment = function (text) {
  const re = /^\\begin{document}/m
  return re.exec(text) !== null
}

const hasBibliographyEnvironment = function (text) {
  const re = /^\\begin{thebibliography}/m
  return re.exec(text) !== null
}

class EnvironmentManager {
  getCompletions(editor, session, pos, prefix, callback) {
    let ind
    const docText = session.getValue()
    const customEnvironments = parseCustomEnvironments(docText)
    const beginCommands = parseBeginCommands(docText)
    if (hasDocumentEnvironment(docText)) {
      ind = staticSnippets.indexOf(documentSnippet)
      if (ind !== -1) {
        staticSnippets.splice(ind, 1)
      }
    } else {
      staticSnippets.push(documentSnippet)
    }

    if (hasBibliographyEnvironment(docText)) {
      ind = staticSnippets.indexOf(bibliographySnippet)
      if (ind !== -1) {
        staticSnippets.splice(ind, 1)
      }
    } else {
      staticSnippets.push(bibliographySnippet)
    }

    const parsedItemsMap = {}
    for (const environment of Array.from(customEnvironments)) {
      parsedItemsMap[environment.name] = environment
    }
    for (const command of Array.from(beginCommands)) {
      parsedItemsMap[command.name] = command
    }
    const parsedItems = _.values(parsedItemsMap)
    const snippets = staticSnippets
      .concat(
        parsedItems.map(item => ({
          caption: `\\begin{${item.name}}...`,
          snippet: `\
\\begin{${item.name}}
${item.whitespace || ''}$0
\\end{${item.name}}\
`,
          meta: 'env',
        }))
      )
      .concat(
        // arguably these `end` commands shouldn't be here, as they're not snippets
        // but this is where we have access to the `begin` environment names
        // *shrug*
        parsedItems.map(item => ({
          caption: `\\end{${item.name}}`,
          value: `\\end{${item.name}}`,
          meta: 'env',
        }))
      )
    return callback(null, snippets)
  }
}

export default EnvironmentManager
