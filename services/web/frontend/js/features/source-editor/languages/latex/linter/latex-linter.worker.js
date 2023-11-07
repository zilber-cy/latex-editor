const Tokenise = function (text) {
  const Tokens = []
  const Comments = []
  let pos = -1
  const SPECIAL = /[\\{}$&#^_~%]/g // match TeX special characters
  const NEXTCS = /[^a-zA-Z]/g // match characters which aren't part of a TeX control sequence
  let idx = 0

  let lineNumber = 0 // current line number when parsing tokens (zero-based)
  const linePosition = [] // mapping from line number to absolute offset of line in text[]
  linePosition[0] = 0

  let checkingDisabled = false
  let count = 0 // number of tokens parses
  const MAX_TOKENS = 100000

  // Main parsing loop, split into tokens on TeX special characters
  // each token is pushed onto the Tokens array as follows
  //
  // special character: [lineNumber, charCode, start]
  // control sequence:  [lineNumber, "\", start, end, "foo"]
  // control symbold:   [lineNumber, "\", start, end, "@"]
  //
  // end position = (position of last character in the sequence) + 1
  //
  // so text.substring(start,end) returns the "foo" for \foo

  while (true) {
    count++

    // Avoid infinite loops and excessively large documents
    if (count > MAX_TOKENS) {
      throw new Error('exceed max token count of ' + MAX_TOKENS)
    }
    const result = SPECIAL.exec(text)

    // If no more special characters found, must be text at end of file
    if (result == null) {
      if (idx < text.length) {
        Tokens.push([lineNumber, 'Text', idx, text.length])
        // FIXME: could check if previous token was Text and merge
      }
      break
    }

    // Break out of loop if not going forwards in the file (shouldn't happen)
    if (result && result.index <= pos) {
      throw new Error('infinite loop in parsing')
    }

    // Move up to the position of the match
    pos = result.index

    // Anything between special characters is text
    if (pos > idx) {
      // FIXME: check if previous token was Text and merge
      Tokens.push([lineNumber, 'Text', idx, pos])
    }

    // Scan over the text and update the line count
    for (let i = idx; i < pos; i++) {
      if (text[i] === '\n') {
        lineNumber++
        linePosition[lineNumber] = i + 1
      }
    }

    const newIdx = SPECIAL.lastIndex
    idx = newIdx

    // Inspect the special character and consume additional characters according to TeX rules
    const code = result[0]
    if (code === '%') {
      // comment character
      // Handle comments by consuming up to the next newline character
      let newLinePos = text.indexOf('\n', idx)
      if (newLinePos === -1) {
        // reached end of file
        newLinePos = text.length
      }
      // Check comment for our magic sequences %novalidate, %begin/%end novalidate
      const commentString = text.substring(idx, newLinePos)
      if (commentString.indexOf('%novalidate') === 0) {
        return []
      } else if (
        !checkingDisabled &&
        commentString.indexOf('%begin novalidate') === 0
      ) {
        checkingDisabled = true
      } else if (
        checkingDisabled &&
        commentString.indexOf('%end novalidate') === 0
      ) {
        checkingDisabled = false
      }
      // Update the line count
      idx = SPECIAL.lastIndex = newLinePos + 1
      Comments.push([lineNumber, idx, newLinePos])
      lineNumber++
      linePosition[lineNumber] = idx
    } else if (checkingDisabled) {
      // do nothing
      continue
    } else if (code === '\\') {
      // escape character
      // Handle TeX control sequences (\foo) and control symbols (\@)
      // Look ahead to find the next character not valid in a control sequence [^a-zA-Z]
      NEXTCS.lastIndex = idx
      const controlSequence = NEXTCS.exec(text)
      let nextSpecialPos =
        controlSequence === null ? idx : controlSequence.index
      if (nextSpecialPos === idx) {
        // it's a control symbol
        Tokens.push([
          lineNumber,
          code,
          pos,
          idx + 1,
          text[idx],
          'control-symbol',
        ])
        idx = SPECIAL.lastIndex = idx + 1
        const char = text[nextSpecialPos]
        // update the line number if someone typed \ at the end of a line
        if (char === '\n') {
          lineNumber++
          linePosition[lineNumber] = nextSpecialPos
        }
      } else {
        // it's a control sequence
        Tokens.push([
          lineNumber,
          code,
          pos,
          nextSpecialPos,
          text.slice(idx, nextSpecialPos),
        ])
        // consume whitespace after a control sequence (update the line number too)
        let char
        while (
          (char = text[nextSpecialPos]) === ' ' ||
          char === '\t' ||
          char === '\r' ||
          char === '\n'
        ) {
          nextSpecialPos++
          if (char === '\n') {
            lineNumber++
            linePosition[lineNumber] = nextSpecialPos
          }
        }
        idx = SPECIAL.lastIndex = nextSpecialPos
      }
    } else if (['{', '}', '$', '&', '#', '^', '_', '~'].indexOf(code) > -1) {
      // special characters
      Tokens.push([lineNumber, code, pos, pos + 1])
    } else {
      throw new Error('unrecognised character ' + code)
    }
  }

  return {
    tokens: Tokens,
    comments: Comments,
    linePosition,
    lineNumber,
    text,
  }
}

// Functions for consuming TeX arguments

const read1arg = function (TokeniseResult, k, options) {
  // read an argument FOO to a either form of command
  // \newcommand\FOO...
  // \newcommand{\FOO}...
  // Also support \newcommand*
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  // check for optional * like \newcommand*
  if (options && options.allowStar) {
    const optional = Tokens[k + 1]
    if (optional && optional[1] === 'Text') {
      const optionalstr = text.substring(optional[2], optional[3])
      if (optionalstr === '*') {
        k++
      }
    }
  }

  const open = Tokens[k + 1]
  const delimiter = Tokens[k + 2]
  const close = Tokens[k + 3]
  // let delimiterName

  if (open && open[1] === '\\') {
    // plain \FOO, isn't enclosed in braces
    // delimiterName = open[4] // array element 4 is command sequence
    return k + 1
  } else if (
    open &&
    open[1] === '{' &&
    delimiter &&
    delimiter[1] === '\\' &&
    close &&
    close[1] === '}'
  ) {
    // argument is in braces
    // delimiterName = delimiter[4] // NOTE: if we were actually using this, keep track of * above
    return k + 3 // array element 4 is command sequence
  } else {
    // couldn't find argument
    return null
  }
}

const readLetDefinition = function (TokeniseResult, k) {
  // read a let command  (the equals sign is optional)
  // \let\foo=\bar
  // \let\foo=TOKEN
  // \let\foo\bar
  // \let\foo\TOKEN

  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const first = Tokens[k + 1]
  const second = Tokens[k + 2]
  const third = Tokens[k + 3]

  if (first && first[1] === '\\' && second && second[1] === '\\') {
    return k + 2
  } else if (
    first &&
    first[1] === '\\' &&
    second &&
    second[1] === 'Text' &&
    text.substring(second[2], second[3]) === '=' &&
    third &&
    third[1] === '\\'
  ) {
    return k + 3
  } else {
    // couldn't find argument
    return null
  }
}

const read1name = function (TokeniseResult, k) {
  // read an environemt name FOO in
  // \newenvironment{FOO}...
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const open = Tokens[k + 1]
  const delimiter = Tokens[k + 2]
  const close = Tokens[k + 3]

  if (
    open &&
    open[1] === '{' &&
    delimiter &&
    delimiter[1] === 'Text' &&
    close &&
    close[1] === '}'
  ) {
    // let delimiterName = text.substring(delimiter[2], delimiter[3])
    return k + 3
  } else if (open && open[1] === '{' && delimiter && delimiter[1] === 'Text') {
    // handle names like FOO_BAR
    let delimiterName = ''
    let j, tok
    for (j = k + 2, tok; (tok = Tokens[j]); j++) {
      if (tok[1] === 'Text') {
        const str = text.substring(tok[2], tok[3])
        if (!str.match(/^\S*$/)) {
          break
        }
        delimiterName = delimiterName + str
      } else if (tok[1] === '_') {
        delimiterName = delimiterName + '_'
      } else {
        break
      }
    }
    if (tok && tok[1] === '}') {
      return j // advance past these tokens
    } else {
      return null
    }
  } else {
    // couldn't find environment name
    return null
  }
}

const read1filename = function (TokeniseResult, k) {
  // read an filename foo_bar.tex
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  let fileName = ''
  let j, tok
  for (j = k + 1, tok; (tok = Tokens[j]); j++) {
    if (tok[1] === 'Text') {
      const str = text.substring(tok[2], tok[3])
      if (!str.match(/^\S*$/)) {
        break
      }
      fileName = fileName + str
    } else if (tok[1] === '_') {
      fileName = fileName + '_'
    } else {
      break
    }
  }
  if (fileName.length > 0) {
    return j // advance past these tokens
  } else {
    return null
  }
}

const readOptionalParams = function (TokeniseResult, k) {
  // read an optional parameter [N] where N is a number, used
  // for \newcommand{\foo}[2]... meaning 2 parameters
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const params = Tokens[k + 1]

  // Quick check for arguments like [1][key=value,key=value]
  if (params && params[1] === 'Text') {
    const paramNum = text.substring(params[2], params[3])
    if (paramNum.match(/^\[\d+\](\[[^\]]*\])*\s*$/)) {
      return k + 1 // got it
    }
  }

  // Skip over arbitrary arguments [xxx][yyy][\foo{zzz}]{... up to the first {..
  let count = 0
  let nextToken = Tokens[k + 1]
  if (!nextToken) {
    return null
  }
  const pos = nextToken[2]

  for (let i = pos, end = text.length; i < end; i++) {
    const char = text[i]
    if (nextToken && i >= nextToken[2]) {
      k++
      nextToken = Tokens[k + 1]
    }
    if (char === '[') {
      count++
    }
    if (char === ']') {
      count--
    }
    if (count === 0 && char === '{') {
      return k - 1
    }
    if (count > 0 && (char === '\r' || char === '\n')) {
      return null
    }
  }

  // can't find an optional parameter
  return null
}

const readOptionalGeneric = function (TokeniseResult, k) {
  // read an optional parameter [foo]
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const params = Tokens[k + 1]

  if (params && params[1] === 'Text') {
    const paramNum = text.substring(params[2], params[3])
    if (paramNum.match(/^(\[[^\]]*\])+\s*$/)) {
      return k + 1 // got it
    }
  }

  // can't find an optional parameter
  return null
}

const readOptionalDef = function (TokeniseResult, k) {
  // skip over the optional arguments of a definition
  // \def\foo#1.#2(#3){this is the macro #1 #2 #3}
  // start looking at text immediately after \def command
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const defToken = Tokens[k]
  const pos = defToken[3]

  const openBrace = '{'
  let nextToken = Tokens[k + 1]
  for (let i = pos, end = text.length; i < end; i++) {
    const char = text[i]
    if (nextToken && i >= nextToken[2]) {
      k++
      nextToken = Tokens[k + 1]
    }
    if (char === openBrace) {
      return k - 1
    } // move back to the last token of the optional arguments
    if (char === '\r' || char === '\n') {
      return null
    }
  }

  return null
}

const readDefinition = function (TokeniseResult, k) {
  // read a definition as in
  // \newcommand{\FOO}{DEFN}
  // \newcommand{\FOO}   {DEF}  (optional whitespace)
  // look ahead for argument, consuming whitespace
  // the definition is read looking for balanced { } braces.
  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  k = k + 1
  let count = 0
  let nextToken = Tokens[k]
  while (nextToken && nextToken[1] === 'Text') {
    const start = nextToken[2]
    const end = nextToken[3]
    for (let i = start; i < end; i++) {
      const char = text[i]
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        continue
      }
      return null // bail out, should begin with a {
    }
    k++
    nextToken = Tokens[k]
  }

  // Now we're at the start of the actual argument
  if (nextToken && nextToken[1] === '{') {
    count++
    // use simple bracket matching { } to find where the
    // argument ends
    while (count > 0) {
      k++
      nextToken = Tokens[k]
      if (!nextToken) {
        break
      }
      if (nextToken[1] === '}') {
        count--
      }
      if (nextToken[1] === '{') {
        count++
      }
    }
    return k
  }

  return null
}

const readVerb = function (TokeniseResult, k) {
  // read a verbatim argument
  // \verb@foo@
  // \verb*@foo@
  // where @ is any character except * for \verb
  // foo is any sequence excluding end-of-line and the delimiter
  // a space does work for @, contrary to latex documentation

  // Note: this is only an approximation, because we have already
  // tokenised the input stream, and we should really do that taking
  // into account the effect of verb.  For example \verb|%| will get
  // confused because % is then a character.

  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const verbToken = Tokens[k]
  // const verbStr = text.substring(verbToken[2], verbToken[3])

  // start looking at text immediately after \verb command
  let pos = verbToken[3]
  if (text[pos] === '*') {
    pos++
  } // \verb* form of command
  const delimiter = text[pos]
  pos++

  let nextToken = Tokens[k + 1]
  for (let i = pos, end = text.length; i < end; i++) {
    const char = text[i]
    if (nextToken && i >= nextToken[2]) {
      k++
      nextToken = Tokens[k + 1]
    }
    if (char === delimiter) {
      return k
    }
    if (char === '\r' || char === '\n') {
      return null
    }
  }

  return null
}

const readUrl = function (TokeniseResult, k) {
  // read a url argument
  // \url|foo|
  // \url{foo}

  // Note: this is only an approximation, because we have already
  // tokenised the input stream, so anything after a comment
  // character % on the current line will not be present in the
  // input stream.

  const Tokens = TokeniseResult.tokens
  const text = TokeniseResult.text

  const urlToken = Tokens[k]
  // const urlStr = text.substring(urlToken[2], urlToken[3])

  // start looking at text immediately after \url command
  let pos = urlToken[3]
  const openDelimiter = text[pos]
  const closeDelimiter = openDelimiter === '{' ? '}' : openDelimiter

  // Was the delimiter a token? if so, advance token index
  let nextToken = Tokens[k + 1]
  if (nextToken && pos === nextToken[2]) {
    k++
    nextToken = Tokens[k + 1]
  }

  // Now start looking at the enclosed text
  pos++

  let count = 1
  for (let i = pos, end = text.length; count > 0 && i < end; i++) {
    const char = text[i]
    if (nextToken && i >= nextToken[2]) {
      k++
      nextToken = Tokens[k + 1]
    }
    if (char === closeDelimiter) {
      count--
    } else if (char === openDelimiter) {
      count++
    }
    if (count === 0) {
      return k
    }
    if (char === '\r' || char === '\n') {
      return null
    }
  }

  return null
}

const InterpretTokens = function (TokeniseResult, ErrorReporter) {
  const Tokens = TokeniseResult.tokens
  // var linePosition = TokeniseResult.linePosition
  // var lineNumber = TokeniseResult.lineNumber
  const text = TokeniseResult.text

  const TokenErrorFromTo = ErrorReporter.TokenErrorFromTo
  const TokenError = ErrorReporter.TokenError
  const Environments = new EnvHandler(TokeniseResult, ErrorReporter)

  let nextGroupMathMode = null // if the next group should have
  // math mode on(=true) or
  // off(=false) (for \hbox), or
  // unknown(=undefined) or inherit
  // the current math mode from the
  // parent environment(=null)
  const nextGroupMathModeStack = [] // tracking all nextGroupMathModes
  let seenUserDefinedBeginEquation = false // if we have seen macros like \beq
  let seenUserDefinedEndEquation = false // if we have seen macros like \eeq

  // Iterate over the tokens, looking for environments to match
  //
  // Push environment command found (\begin, \end) onto the
  // Environments array.

  for (let i = 0, len = Tokens.length; i < len; i++) {
    const token = Tokens[i]
    // const line = token[0]
    const type = token[1]
    // const start = token[2]
    // const end = token[3]
    const seq = token[4]

    if (type === '{') {
      // handle open group as a type of environment
      Environments.push({
        command: '{',
        token,
        mathMode: nextGroupMathMode,
      })
      // if previously encountered a macro with a known or
      // unknow math mode set that, and put it on a stack to be
      // used for subsequent arguments \foo{...}{...}{...}
      nextGroupMathModeStack.push(nextGroupMathMode)
      nextGroupMathMode = null
      continue
    } else if (type === '}') {
      // handle close group as a type of environment
      Environments.push({ command: '}', token })
      // retrieve the math mode of the current macro (if any)
      // for subsequent arguments
      nextGroupMathMode = nextGroupMathModeStack.pop()
      continue
    } else {
      // we aren't opening or closing a group, so reset the
      // nextGroupMathMode - the next group will not be in math
      // mode or undefined unless otherwise specified below
      nextGroupMathMode = null
    }

    if (type === '\\') {
      // Interpret each control sequence
      if (seq === 'begin' || seq === 'end') {
        // We've got a begin or end, now look ahead at the
        // next three tokens which should be "{" "ENVNAME" "}"
        const open = Tokens[i + 1]
        const delimiter = Tokens[i + 2]
        const close = Tokens[i + 3]
        if (
          open &&
          open[1] === '{' &&
          delimiter &&
          delimiter[1] === 'Text' &&
          close &&
          close[1] === '}'
        ) {
          // We've got a valid environment command, push it onto the array.
          const delimiterName = text.substring(delimiter[2], delimiter[3])
          Environments.push({
            command: seq,
            name: delimiterName,
            token,
            closeToken: close,
          })
          i = i + 3 // advance past these tokens
        } else {
          // Check for an environment command like \begin{new_major_theorem}
          if (open && open[1] === '{' && delimiter && delimiter[1] === 'Text') {
            let delimiterName = ''
            let j, tok
            for (j = i + 2, tok; (tok = Tokens[j]); j++) {
              if (tok[1] === 'Text') {
                const str = text.substring(tok[2], tok[3])
                if (!str.match(/^\S*$/)) {
                  break
                }
                delimiterName = delimiterName + str
              } else if (tok[1] === '_') {
                delimiterName = delimiterName + '_'
              } else {
                break
              }
            }
            if (tok && tok[1] === '}') {
              Environments.push({
                command: seq,
                name: delimiterName,
                token,
                closeToken: close,
              })
              i = j // advance past these tokens
              continue
            }
          }

          // We're looking at an invalid environment command, read as far as we can in the sequence
          // "{" "CHAR" "CHAR" "CHAR" ... to report an error for as much of the command as we can,
          // bail out when we hit a space/newline.
          let endToken = null
          if (open && open[1] === '{') {
            endToken = open // we've got a {
            if (delimiter && delimiter[1] === 'Text') {
              endToken = delimiter.slice() // we've got some text following the {
              const start = endToken[2]
              const end = endToken[3]
              let j
              for (j = start; j < end; j++) {
                const char = text[j]
                if (
                  char === ' ' ||
                  char === '\t' ||
                  char === '\r' ||
                  char === '\n'
                ) {
                  break
                }
              }
              endToken[3] = j // the end of partial token is as far as we got looking ahead
            }
          }

          if (endToken) {
            TokenErrorFromTo(
              token,
              endToken,
              'invalid environment command ' +
                text.substring(token[2], endToken[3] || endToken[2])
            )
          } else {
            TokenError(token, 'invalid environment command')
          }
        }
      } else if (typeof seq === 'string' && seq.match(/^(be|beq|beqa|bea)$/i)) {
        // Environments.push({command: "begin", name: "user-defined-equation", token: token});
        seenUserDefinedBeginEquation = true
      } else if (
        typeof seq === 'string' &&
        seq.match(/^(ee|eeq|eeqn|eeqa|eeqan|eea)$/i)
      ) {
        // Environments.push({command: "end", name: "user-defined-equation", token: token});
        seenUserDefinedEndEquation = true
      } else if (
        seq === 'newcommand' ||
        seq === 'renewcommand' ||
        seq === 'DeclareRobustCommand'
      ) {
        // Parse command definitions in a limited way, to
        // avoid falsely reporting errors from unmatched
        // environments in the command definition
        //
        // e.g. \newcommand{\foo}{\begin{equation}} is valid
        // and should not trigger an "unmatch environment"
        // error

        // try to read first arg \newcommand{\foo}...., advance if found
        // and otherwise bail out
        let newPos = read1arg(TokeniseResult, i, { allowStar: true })
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }

        // try to read any optional params [BAR]...., advance if found
        newPos = readOptionalParams(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read command defintion {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (seq === 'def') {
        // try to read first arg \def\foo...., advance if found
        // and otherwise bail out
        let newPos = read1arg(TokeniseResult, i)
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }

        // try to read any optional params [BAR]...., advance if found
        newPos = readOptionalDef(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read command defintion {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (seq === 'let') {
        // Parse any \let commands  can be
        // \let\foo\bar
        // \let\foo=\bar
        // \let\foo=TOKEN
        const newPos = readLetDefinition(TokeniseResult, i)
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }
      } else if (seq === 'newcolumntype') {
        // try to read first arg \newcolumntype{T}...., advance if found
        // and otherwise bail out
        let newPos = read1name(TokeniseResult, i)
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }

        // try to read any optional params [BAR]...., advance if found
        newPos = readOptionalParams(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read command defintion {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (seq === 'newenvironment' || seq === 'renewenvironment') {
        // Parse environment definitions in a limited way too
        // \newenvironment{name}[3]{open}{close}

        // try to read first arg \newcommand{\foo}...., advance if found
        // and otherwise bail out
        let newPos = read1name(TokeniseResult, i)
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }

        // try to read any optional params [BAR]...., advance if found
        newPos = readOptionalParams(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read open defintion {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read close defintion {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (seq === 'verb') {
        // \verb|....|  where | = any char
        const newPos = readVerb(TokeniseResult, i)
        if (newPos === null) {
          TokenError(token, 'invalid verbatim command')
        } else {
          i = newPos
        }
      } else if (seq === 'url') {
        // \url{...} or \url|....|  where | = any char
        const newPos = readUrl(TokeniseResult, i)
        if (newPos === null) {
          TokenError(token, 'invalid url command')
        } else {
          i = newPos
        }
      } else if (seq === 'left' || seq === 'right') {
        // \left( and \right)
        const nextToken = Tokens[i + 1]
        let char = ''
        if (nextToken && nextToken[1] === 'Text') {
          char = text.substring(nextToken[2], nextToken[2] + 1)
        } else if (
          nextToken &&
          nextToken[1] === '\\' &&
          nextToken[5] === 'control-symbol'
        ) {
          // control symbol
          char = nextToken[4]
        } else if (nextToken && nextToken[1] === '\\') {
          char = 'unknown'
        }
        if (
          char === '' ||
          (char !== 'unknown' && '(){}[]<>/|\\.'.indexOf(char) === -1)
        ) {
          // unrecognized bracket  - list of allowed delimiters from TeX By Topic (38.3.2 Delimiter codes)
          TokenError(token, 'invalid bracket command')
        } else {
          i = i + 1
          Environments.push({ command: seq, token })
        }
      } else if (seq === '(' || seq === ')' || seq === '[' || seq === ']') {
        Environments.push({ command: seq, token })
      } else if (seq === 'input') {
        // skip over filenames, may contain _
        const newPos = read1filename(TokeniseResult, i)
        if (newPos === null) {
          continue
        } else {
          i = newPos
        }
      } else if (
        seq === 'hbox' ||
        seq === 'text' ||
        seq === 'mbox' ||
        seq === 'footnote' ||
        seq === 'intertext' ||
        seq === 'shortintertext' ||
        seq === 'textnormal' ||
        seq === 'tag' ||
        seq === 'reflectbox' ||
        seq === 'textrm'
      ) {
        // next group will be in text mode regardless
        nextGroupMathMode = false
      } else if (seq === 'tikz') {
        // try to read any optional params [BAR]...., advance if found
        const newPos = readOptionalGeneric(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
        nextGroupMathMode = false
      } else if (
        seq === 'rotatebox' ||
        seq === 'scalebox' ||
        seq === 'feynmandiagram'
      ) {
        // try to read any optional params [BAR]...., advance if found
        let newPos = readOptionalGeneric(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
        // try to read parameter {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
        nextGroupMathMode = false
      } else if (seq === 'resizebox') {
        // try to read any optional params [BAR]...., advance if found
        let newPos = readOptionalGeneric(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
        // try to read width parameter {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
        // try to read height parameter {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        nextGroupMathMode = false
      } else if (seq === 'DeclareMathOperator') {
        // try to read first arg {....}, advance if found
        let newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read second arg {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (seq === 'DeclarePairedDelimiter') {
        // try to read first arg {....}, advance if found
        let newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read second arg {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }

        // try to read third arg {....}, advance if found
        newPos = readDefinition(TokeniseResult, i)
        if (newPos === null) {
          /* do nothing */
        } else {
          i = newPos
        }
      } else if (
        typeof seq === 'string' &&
        seq.match(
          /^(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)$/
        )
      ) {
        const currentMathMode = Environments.getMathMode() // returns null / $(inline) / $$(display)
        if (currentMathMode === null) {
          TokenError(token, type + seq + ' must be inside math mode', {
            mathMode: true,
          })
        }
      } else if (
        typeof seq === 'string' &&
        seq.match(/^(chapter|section|subsection|subsubsection)$/)
      ) {
        const currentMathMode = Environments.getMathMode() // returns null / $(inline) / $$(display)
        if (currentMathMode) {
          TokenError(token, type + seq + ' used inside math mode', {
            mathMode: true,
          })
          Environments.resetMathMode()
        }
      } else if (typeof seq === 'string' && seq.match(/^[a-z]+$/)) {
        // if we see an unknown command \foo{...}{...} put the
        // math mode for the next group into the 'undefined'
        // state, because we do not know what math mode an
        // arbitrary macro will use for its arguments.  In the
        // math mode 'undefined' state we don't report errors
        // when we encounter math or text commands.
        nextGroupMathMode = undefined
      }
    } else if (type === '$') {
      const lookAhead = Tokens[i + 1]
      const nextIsDollar = lookAhead && lookAhead[1] === '$'
      const currentMathMode = Environments.getMathMode() // returns null / $(inline) / $$(display)
      // If we have a $$ and we're not in displayMath, we go into that
      // If we have a $$ and with not in math mode at all, we got into displayMath
      if (
        nextIsDollar &&
        (!currentMathMode || currentMathMode.command === '$$')
      ) {
        let delimiterToken
        if (currentMathMode && currentMathMode.command === '$$') {
          // Use last $ as token if it's the end of math mode, so that we capture all content, including both $s
          delimiterToken = lookAhead
        } else {
          delimiterToken = token
        }
        Environments.push({ command: '$$', token: delimiterToken })
        i = i + 1
      } else {
        Environments.push({ command: '$', token })
      }
    } else if (type === '^' || type === '_') {
      // check for mathmode ASSUMING environments are correct
      // if they aren't we'll catch it below
      // we can maybe set a flag here for math mode state?
      const currentMathMode = Environments.getMathMode() // returns null / $(inline) / $$(display)
      // need to exclude cases like \cite{foo_bar} so ignore everything inside {...}
      const insideGroup = Environments.insideGroup() // true if inside {....}
      if (currentMathMode === null && !insideGroup) {
        TokenError(token, type + ' must be inside math mode', {
          mathMode: true,
        })
      }
    }
  }

  if (seenUserDefinedBeginEquation && seenUserDefinedEndEquation) {
    // there are commands like \beq or \eeq which are typically
    // shortcuts for \begin{equation} and \end{equation}, so
    // disable math errors
    ErrorReporter.filterMath = true
  }

  return Environments
}

const DocumentTree = function (TokeniseResult) {
  // Each environment and scope becomes and an entry in the tree, and can have
  // child entries, e.g. an 'array' inside an 'equation' inside a 'document' environment.
  // Entries can have multiple adjacent children.
  const tree = {
    children: [],
  }
  // The stack is just for easily moving up and down the tree. Popping off the stack
  // moves us back up the context of the current environment.
  const stack = [tree]

  this.openEnv = function (startDelimiter) {
    const currentNode = this.getCurrentNode()
    const newNode = {
      startDelimiter,
      children: [],
    }
    currentNode.children.push(newNode)
    stack.push(newNode)
  }

  this.closeEnv = function (endDelimiter) {
    if (stack.length === 1) {
      // Can't close root element
      return null
    }
    const currentNode = stack.pop()
    currentNode.endDelimiter = endDelimiter
    return currentNode.startDelimiter
  }

  this.getNthPreviousNode = function (n) {
    const offset = stack.length - n - 1
    if (offset < 0) return null
    return stack[offset]
  }

  this.getCurrentNode = function () {
    return this.getNthPreviousNode(0)
  }

  this.getCurrentDelimiter = function () {
    return this.getCurrentNode().startDelimiter
  }

  this.getPreviousDelimiter = function () {
    const node = this.getNthPreviousNode(1)
    if (!node) return null
    return node.startDelimiter
  }

  this.getDepth = function () {
    return stack.length - 1 // Root node doesn't count
  }

  this.getContexts = function () {
    const linePosition = TokeniseResult.linePosition

    function tokenToRange(token) {
      const line = token[0]
      const start = token[2]
      let end = token[3]
      const startCol = start - linePosition[line]
      if (!end) {
        end = start + 1
      }
      const endCol = end - linePosition[line]
      return {
        start: {
          row: line,
          column: startCol,
        },
        end: {
          row: line,
          column: endCol,
        },
      }
    }

    function getContextsFromNode(node) {
      if (node.startDelimiter && node.startDelimiter.mathMode) {
        const context = {
          type: 'math',
          range: {
            start: tokenToRange(node.startDelimiter.token).start,
          },
        }
        if (node.endDelimiter) {
          const closeToken =
            node.endDelimiter.closeToken || node.endDelimiter.token
          context.range.end = tokenToRange(closeToken).end
        }
        return [context]
      } else {
        let contexts = []
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]
          contexts = contexts.concat(getContextsFromNode(child))
        }
        return contexts
      }
    }

    return getContextsFromNode(tree)
  }
}

const EnvHandler = function (TokeniseResult, ErrorReporter) {
  // Loop through the Environments array keeping track of the state,
  // pushing and popping environments onto the state[] array for each
  // \begin and \end command
  const ErrorTo = ErrorReporter.EnvErrorTo
  const ErrorFromTo = ErrorReporter.EnvErrorFromTo
  const ErrorFrom = ErrorReporter.EnvErrorFrom

  const delimiters = []

  const document = new DocumentTree(TokeniseResult)
  let documentClosed = null
  let inVerbatim = false
  const verbatimRanges = []

  this.getDocument = function () {
    return document
  }

  this.push = function (newDelimiter) {
    this.setDelimiterProps(newDelimiter)
    this.checkAndUpdateState(newDelimiter)
    delimiters.push(newDelimiter)
  }

  this._endVerbatim = function (thisDelimiter) {
    const lastDelimiter = document.getCurrentDelimiter()
    if (lastDelimiter && lastDelimiter.name === thisDelimiter.name) {
      // closed verbatim environment correctly
      inVerbatim = false
      document.closeEnv(thisDelimiter)
      // keep track of all the verbatim ranges to filter out errors
      verbatimRanges.push({
        start: lastDelimiter.token[2],
        end: thisDelimiter.token[2],
      })
    }
  }

  const invalidEnvs = []

  this._end = function (thisDelimiter) {
    // check if environment or group is closed correctly
    let retry
    do {
      retry = false
      const lastDelimiter = document.getCurrentDelimiter()
      let i

      if (closedBy(lastDelimiter, thisDelimiter)) {
        // closed correctly
        document.closeEnv(thisDelimiter)
        if (
          thisDelimiter.command === 'end' &&
          thisDelimiter.name === 'document' &&
          !documentClosed
        ) {
          documentClosed = thisDelimiter
        }
        return
      } else if (!lastDelimiter) {
        // unexpected close, nothing was open!
        if (documentClosed) {
          ErrorFromTo(
            documentClosed,
            thisDelimiter,
            '\\end{' +
              documentClosed.name +
              '} is followed by unexpected content',
            { errorAtStart: true, type: 'info' }
          )
        } else {
          ErrorTo(thisDelimiter, 'unexpected ' + getName(thisDelimiter))
        }
      } else if (
        invalidEnvs.length > 0 &&
        (i = indexOfClosingEnvInArray(invalidEnvs, thisDelimiter) > -1)
      ) {
        // got a match on an invalid env, so try to continue
        invalidEnvs.splice(i, 1)
        return
      } else {
        reportError(lastDelimiter, thisDelimiter)
        if (
          delimiterPrecedence(lastDelimiter) <
          delimiterPrecedence(thisDelimiter)
        ) {
          // discard the lastDelimiter then retry the match for thisDelimiter
          document.closeEnv()
          invalidEnvs.push(lastDelimiter)
          retry = true
        } else {
          // tried to close a different environment for the one that is open
          // Apply some heuristics to try to minimise cascading errors
          //
          // Consider cases of
          // 1) Extra \end:      \begin{A}  \end{B}  \end{A}
          // 2) Extra \begin:    \begin{A}  \begin{B} \end{A}
          //
          // Case (2) try looking back to the previous \begin,
          // if it gives a valid match, take it!
          const prevDelimiter = document.getPreviousDelimiter()
          if (prevDelimiter) {
            if (thisDelimiter.name === prevDelimiter.name) {
              //  got a match on the previous environment
              document.closeEnv() // Close current env
              document.closeEnv(thisDelimiter) // Close previous env
              return
            }
          }
          // No match so put lastDelimiter back on a list of valid
          // environments that we might be able to match on
          // further errors
          invalidEnvs.push(lastDelimiter)
        }
      }
    } while (retry === true)
  }

  const CLOSING_DELIMITER = {
    '{': '}',
    left: 'right',
    '[': ']',
    '(': ')',
    $: '$',
    $$: '$$',
  }

  const closedBy = function (lastDelimiter, thisDelimiter) {
    if (!lastDelimiter) {
      return false
    } else if (thisDelimiter.command === 'end') {
      return (
        lastDelimiter.command === 'begin' &&
        lastDelimiter.name === thisDelimiter.name
      )
    } else if (
      thisDelimiter.command === CLOSING_DELIMITER[lastDelimiter.command]
    ) {
      return true
    } else {
      return false
    }
  }

  const indexOfClosingEnvInArray = function (delimiters, thisDelimiter) {
    for (let i = 0, n = delimiters.length; i < n; i++) {
      if (closedBy(delimiters[i], thisDelimiter)) {
        return i
      }
    }
    return -1
  }

  const delimiterPrecedence = function (delimiter) {
    const openScore = {
      '{': 1,
      left: 2,
      $: 3,
      $$: 4,
      begin: 4,
    }
    const closeScore = {
      '}': 1,
      right: 2,
      $: 3,
      $$: 5,
      end: 4,
    }
    if (delimiter.command) {
      return openScore[delimiter.command] || closeScore[delimiter.command]
    } else {
      return 0
    }
  }

  const getName = function (delimiter) {
    const description = {
      '{': 'open group {',
      '}': 'close group }',
      '[': 'open display math \\[',
      ']': 'close display math \\]',
      '(': 'open inline math \\(',
      ')': 'close inline math \\)',
      $: '$',
      $$: '$$',
      left: '\\left',
      right: '\\right',
    }
    if (delimiter.command === 'begin' || delimiter.command === 'end') {
      return '\\' + delimiter.command + '{' + delimiter.name + '}'
    } else if (delimiter.command in description) {
      return description[delimiter.command]
    } else {
      return delimiter.command
    }
  }

  const EXTRA_CLOSE = 1
  const UNCLOSED_GROUP = 2
  const UNCLOSED_ENV = 3

  const reportError = function (lastDelimiter, thisDelimiter) {
    if (!lastDelimiter) {
      // unexpected close, nothing was open!
      if (documentClosed) {
        ErrorFromTo(
          documentClosed,
          thisDelimiter,
          '\\end{' +
            documentClosed.name +
            '} is followed by unexpected end group }',
          { errorAtStart: true, type: 'info' }
        )
      } else {
        ErrorTo(thisDelimiter, 'unexpected ' + getName(thisDelimiter))
      }
      return EXTRA_CLOSE
    } else if (
      lastDelimiter.command === '{' &&
      thisDelimiter.command === 'end'
    ) {
      ErrorFromTo(
        lastDelimiter,
        thisDelimiter,
        'unclosed ' +
          getName(lastDelimiter) +
          ' found at ' +
          getName(thisDelimiter),
        { suppressIfEditing: true, errorAtStart: true, type: 'warning' }
      )
      // discard the open group by not pushing it back on the stack
      return UNCLOSED_GROUP
    } else {
      ErrorFromTo(
        lastDelimiter,
        thisDelimiter,
        'unclosed ' +
          getName(lastDelimiter) +
          ' found at ' +
          getName(thisDelimiter),
        { suppressIfEditing: true, errorAtStart: true }
      )
      ErrorFromTo(
        lastDelimiter,
        thisDelimiter,
        'unexpected ' +
          getName(thisDelimiter) +
          ' after ' +
          getName(lastDelimiter)
      )
      return UNCLOSED_ENV
    }
  }

  this._beginMathMode = function (thisDelimiter) {
    // start a new math environment
    const currentMathMode = this.getMathMode() // undefined, null, $, $$, name of mathmode env
    if (currentMathMode) {
      ErrorFrom(
        thisDelimiter,
        getName(thisDelimiter) +
          ' used inside existing math mode ' +
          getName(currentMathMode),
        { suppressIfEditing: true, errorAtStart: true, mathMode: true }
      )
    }
    thisDelimiter.mathMode = thisDelimiter
    document.openEnv(thisDelimiter)
  }

  this._toggleMathMode = function (thisDelimiter) {
    // math environments use the same for begin and end.
    const lastDelimiter = document.getCurrentDelimiter()
    if (closedBy(lastDelimiter, thisDelimiter)) {
      // closed math environment correctly
      document.closeEnv(thisDelimiter)
    } else {
      if (lastDelimiter && lastDelimiter.mathMode) {
        // already in math mode
        this._end(thisDelimiter)
      } else {
        // start a new math environment
        thisDelimiter.mathMode = thisDelimiter
        document.openEnv(thisDelimiter)
      }
    }
  }

  this.getMathMode = function () {
    // return the current mathmode.
    // the mathmode is an object, it is the environment that opened the math mode
    const currentDelimiter = document.getCurrentDelimiter()
    if (currentDelimiter) {
      return currentDelimiter.mathMode
    } else {
      return null
    }
  }

  this.insideGroup = function () {
    const currentDelimiter = document.getCurrentDelimiter()
    if (currentDelimiter) {
      return currentDelimiter.command === '{'
    } else {
      return null
    }
  }

  const resetMathMode = function () {
    // Wind back the current environment stack removing everything
    // from the start of the current math mode
    const currentDelimiter = document.getCurrentDelimiter()
    if (currentDelimiter) {
      const lastMathMode = currentDelimiter.mathMode
      let lastDelimiter
      do {
        lastDelimiter = document.closeEnv()
      } while (lastDelimiter && lastDelimiter !== lastMathMode)
    } else {
      // return
    }
  }

  this.resetMathMode = resetMathMode

  const getNewMathMode = function (currentMathMode, thisDelimiter) {
    // look at math mode and transitions
    //
    // We have several cases
    //
    // 1. environments that can only be used outside math mode (document, quote, etc)
    // 2. environments that can only be used inside math mode (array)
    // 3. environments that start math mode (equation)
    // 4. environments that are unknown (new_theorem)
    let newMathMode = null

    if (thisDelimiter.command === '{') {
      if (thisDelimiter.mathMode !== null) {
        // the group is a special one with a definite mathmode e.g. \hbox
        newMathMode = thisDelimiter.mathMode
      } else {
        newMathMode = currentMathMode
      }
    } else if (thisDelimiter.command === 'left') {
      if (currentMathMode === null) {
        ErrorFrom(thisDelimiter, '\\left can only be used in math mode', {
          mathMode: true,
        })
      }
      newMathMode = currentMathMode
    } else if (thisDelimiter.command === 'begin') {
      const name = thisDelimiter.name
      if (name) {
        if (
          name.match(
            /^(document|figure|center|enumerate|itemize|table|abstract|proof|lemma|theorem|definition|proposition|corollary|remark|notation|thebibliography)$/
          )
        ) {
          // case 1, must be outside math mode
          if (currentMathMode) {
            ErrorFromTo(
              currentMathMode,
              thisDelimiter,
              thisDelimiter.name + ' used inside ' + getName(currentMathMode),
              { suppressIfEditing: true, errorAtStart: true, mathMode: true }
            )
            resetMathMode()
          }
          newMathMode = null
        } else if (
          name.match(/^(array|gathered|split|aligned|alignedat)\*?$/)
        ) {
          // case 2, must be inside math mode
          if (currentMathMode === null) {
            ErrorFrom(
              thisDelimiter,
              thisDelimiter.name + ' not inside math mode',
              { mathMode: true }
            )
          }
          newMathMode = currentMathMode
        } else if (
          name.match(
            /^(math|displaymath|equation|eqnarray|multline|align|gather|flalign|alignat)\*?$/
          )
        ) {
          // case 3, must be outside math mode but starts it
          if (currentMathMode) {
            ErrorFromTo(
              currentMathMode,
              thisDelimiter,
              thisDelimiter.name + ' used inside ' + getName(currentMathMode),
              { suppressIfEditing: true, errorAtStart: true, mathMode: true }
            )
            resetMathMode()
          }
          newMathMode = thisDelimiter
        } else {
          // case 4, unknown environments
          newMathMode = undefined // undefined means we don't know if we are in math mode or not
        }
      }
    }
    return newMathMode
  }

  this.checkAndUpdateState = function (thisDelimiter) {
    if (inVerbatim) {
      if (thisDelimiter.command === 'end') {
        this._endVerbatim(thisDelimiter)
      } else {
        // return // ignore anything in verbatim environments
      }
    } else if (
      thisDelimiter.command === 'begin' ||
      thisDelimiter.command === '{' ||
      thisDelimiter.command === 'left'
    ) {
      if (thisDelimiter.verbatim) {
        inVerbatim = true
      }
      // push new environment onto stack
      const currentMathMode = this.getMathMode() // undefined, null, $, $$, name of mathmode env
      const newMathMode = getNewMathMode(currentMathMode, thisDelimiter)
      thisDelimiter.mathMode = newMathMode
      document.openEnv(thisDelimiter)
    } else if (thisDelimiter.command === 'end') {
      this._end(thisDelimiter)
    } else if (thisDelimiter.command === '(' || thisDelimiter.command === '[') {
      this._beginMathMode(thisDelimiter)
    } else if (thisDelimiter.command === ')' || thisDelimiter.command === ']') {
      this._end(thisDelimiter)
    } else if (thisDelimiter.command === '}') {
      this._end(thisDelimiter)
    } else if (thisDelimiter.command === 'right') {
      this._end(thisDelimiter)
    } else if (
      thisDelimiter.command === '$' ||
      thisDelimiter.command === '$$'
    ) {
      this._toggleMathMode(thisDelimiter)
    }
  }

  this.close = function () {
    // If there is anything left in the state at this point, there
    // were unclosed environments or groups.
    while (document.getDepth() > 0) {
      const thisDelimiter = document.closeEnv()
      if (thisDelimiter.command === '{') {
        // Note that having an unclosed group does not stop
        // compilation in TeX but we will highlight it as an error
        ErrorFrom(thisDelimiter, 'unclosed group {', { type: 'warning' })
      } else {
        ErrorFrom(thisDelimiter, 'unclosed ' + getName(thisDelimiter))
      }
    }

    // Filter out any token errors inside verbatim environments
    const vlen = verbatimRanges.length
    const len = ErrorReporter.tokenErrors.length
    if (vlen > 0 && len > 0) {
      for (let i = 0; i < len; i++) {
        const tokenError = ErrorReporter.tokenErrors[i]
        const startPos = tokenError.startPos
        // const endPos = tokenError.endPos
        for (let j = 0; j < vlen; j++) {
          if (
            startPos > verbatimRanges[j].start &&
            startPos < verbatimRanges[j].end
          ) {
            tokenError.ignore = true
            break
          }
        }
      }
    }
  }

  this.setDelimiterProps = function (delimiter) {
    const name = delimiter.name
    // flag any verbatim environments for special handling
    if (
      name &&
      name.match(/^(verbatim|boxedverbatim|lstlisting|minted|Verbatim)$/)
    ) {
      delimiter.verbatim = true
    }
  }
}

// Error reporting functions for tokens and environments
const ErrorReporter = function (TokeniseResult) {
  // const text = TokeniseResult.text
  const linePosition = TokeniseResult.linePosition
  const lineNumber = TokeniseResult.lineNumber

  const errors = []
  const tokenErrors = []
  this.errors = errors
  this.tokenErrors = tokenErrors
  this.filterMath = false

  function pos(row, column) {
    return linePosition[row] + column
  }

  this.getErrors = function () {
    const returnedErrors = []
    for (let i = 0, len = tokenErrors.length; i < len; i++) {
      if (!tokenErrors[i].ignore) {
        returnedErrors.push(tokenErrors[i])
      }
    }
    const allErrors = returnedErrors.concat(errors)
    const result = []

    // Find the total number of math errors and bail out if there are too many
    let mathErrorCount = 0
    for (let i = 0, len = allErrors.length; i < len; i++) {
      if (allErrors[i].mathMode) {
        mathErrorCount++
      }
      if (mathErrorCount > 10) {
        // too many math errors, bailing out
        return []
      }
    }

    // If the user had \beq and \eeq commands filter out any math
    // errors as we cannot reliably track math-mode when there are
    // user-defined environments which turn it on and off
    if (this.filterMath && mathErrorCount > 0) {
      for (let i = 0, len = allErrors.length; i < len; i++) {
        if (!allErrors[i].mathMode) {
          result.push(allErrors[i])
        }
      }
      return result
    } else {
      return allErrors
    }
  }

  // Report an error in a single token

  this.TokenError = function (token, message, options) {
    if (!options) {
      options = { suppressIfEditing: true }
    }
    const line = token[0]
    // const type = token[1]
    const start = token[2]
    let end = token[3]
    const startCol = start - linePosition[line]
    if (!end) {
      end = start + 1
    }
    const endCol = end - linePosition[line]
    tokenErrors.push({
      row: line,
      column: startCol,
      start_row: line,
      start_col: startCol,
      end_row: line,
      end_col: endCol,
      type: 'error',
      text: message,
      pos: pos(line, startCol),
      startPos: start,
      endPos: end,
      suppressIfEditing: options.suppressIfEditing,
      mathMode: options.mathMode,
    })
  }

  // Report an error over a range (from, to)

  this.TokenErrorFromTo = function (fromToken, toToken, message, options) {
    if (!options) {
      options = { suppressIfEditing: true }
    }
    const fromLine = fromToken[0]
    const fromStart = fromToken[2]
    // const fromEnd = fromToken[3]
    const toLine = toToken[0]
    const toStart = toToken[2]
    let toEnd = toToken[3]
    if (!toEnd) {
      toEnd = toStart + 1
    }
    const startCol = fromStart - linePosition[fromLine]
    const endCol = toEnd - linePosition[toLine]

    tokenErrors.push({
      row: fromLine,
      column: startCol,
      start_row: fromLine,
      start_col: startCol,
      end_row: toLine,
      end_col: endCol,
      type: 'error',
      text: message,
      pos: pos(fromLine, startCol),
      startPos: fromStart,
      endPos: toEnd,
      suppressIfEditing: options.suppressIfEditing,
      mathMode: options.mathMode,
    })
  }

  this.EnvErrorFromTo = function (fromEnv, toEnv, message, options) {
    if (!options) {
      options = {}
    }
    const fromToken = fromEnv.token
    let toToken = toEnv.closeToken || toEnv.token
    const fromLine = fromToken[0]
    const fromStart = fromToken[2]
    const fromEnd = (fromEnv.closeToken || fromEnv.token)[3]
    if (!toToken) {
      toToken = fromToken
    }
    const toLine = toToken[0]
    const toStart = (toEnv.token || toEnv.closeToken)[2]
    let toEnd = toToken[3]
    if (!toEnd) {
      toEnd = toStart + 1
    }
    const startCol = fromStart - linePosition[fromLine]
    const endCol = toEnd - linePosition[toLine]
    const row = options.errorAtStart ? fromLine : toLine
    const column = options.errorAtStart ? startCol : endCol
    errors.push({
      row,
      column,
      start_row: fromLine,
      start_col: startCol,
      end_row: toLine,
      end_col: endCol,
      type: options.type ? options.type : 'error',
      text: message,
      startPos: options.errorAtStart ? fromStart : toStart,
      endPos: options.errorAtStart ? fromEnd : toEnd,
      pos: pos(row, column),
      suppressIfEditing: options.suppressIfEditing,
      mathMode: options.mathMode,
    })
  }

  // Report an error up to a given environment (from the beginning of the document)

  this.EnvErrorTo = function (toEnv, message, options) {
    if (!options) {
      options = {}
    }
    const token = toEnv.closeToken || toEnv.token
    const line = token[0]
    // const type = token[1]
    const start = token[2]
    let end = token[3]
    if (!end) {
      end = start + 1
    }
    const endCol = end - linePosition[line]
    const err = {
      row: line,
      column: endCol,
      start_row: 0,
      start_col: 0,
      end_row: line,
      end_col: endCol,
      startPos: start,
      endPos: end,
      pos: pos(line, endCol),
      type: options.type ? options.type : 'error',
      text: message,
      mathMode: options.mathMode,
    }
    errors.push(err)
  }

  // Report an error from a given environment (up to the end of the document)

  this.EnvErrorFrom = function (delimiter, message, options) {
    if (!options) {
      options = {}
    }
    const token = delimiter.token
    const closeToken = delimiter.closeToken
    const line = token[0]
    // const type = token[1]
    const start = token[2]
    const end = (closeToken || token)[3]
    const startCol = start - linePosition[line]
    const endCol = Infinity
    errors.push({
      row: line,
      column: startCol,
      start_row: line,
      start_col: startCol,
      end_row: lineNumber,
      end_col: endCol,
      startPos: start,
      endPos: end,
      pos: pos(line, startCol),
      type: options.type ? options.type : 'error',
      text: message,
      mathMode: options.mathMode,
    })
  }
}

const Parse = function (text) {
  const TokeniseResult = Tokenise(text)
  const Reporter = new ErrorReporter(TokeniseResult)
  const Environments = InterpretTokens(TokeniseResult, Reporter)
  Environments.close()
  return {
    errors: Reporter.getErrors().sort((a, b) => a.startPos - b.startPos),
    contexts: Environments.getDocument().getContexts(),
  }
}

let latestLintResult = null

// Define an onmessage handler if this file is loaded in a Worker context
if (typeof onmessage !== 'undefined') {
  onmessage = function (event) {
    if (event.data && event.type === 'message') {
      let workerResult = {}
      const text = event.data.text
      if (latestLintResult && latestLintResult.text === text) {
        workerResult = latestLintResult.workerResult
      } else {
        try {
          workerResult = Parse(event.data.text)
          latestLintResult = { text, workerResult }
        } catch (err) {
          console.error('error in linting', err)
          workerResult = { errors: [], contexts: [] }
        }
      }
      postMessage(workerResult)
    }
  }
}
// export dummy class for testing
export default class LintWorker {
  postMessage(message) {}
  addEventListener(eventName, listener) {}
  Parse(text) {
    return Parse(text)
  }
}
