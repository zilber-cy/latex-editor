import {
  useCodeMirrorStateContext,
  useCodeMirrorViewContext,
} from './codemirror-editor'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runScopeHandlers } from '@codemirror/view'
import {
  closeSearchPanel,
  setSearchQuery,
  SearchQuery,
  findPrevious,
  findNext,
  replaceNext,
  replaceAll,
  getSearchQuery,
  SearchCursor,
} from '@codemirror/search'
import { Button, ButtonGroup, FormControl, InputGroup } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Tooltip from '../../../shared/components/tooltip'
import Icon from '../../../shared/components/icon'
import classnames from 'classnames'
import useScopeValue from '../../../shared/hooks/use-scope-value'
import { getStoredSelection, setStoredSelection } from '../extensions/search'
import { debounce } from 'lodash'
import { EditorSelection, EditorState } from '@codemirror/state'

const MATCH_COUNT_DEBOUNCE_WAIT = 100 // the amount of ms to wait before counting matches
const MAX_MATCH_COUNT = 999 // the maximum number of matches to count
const MAX_MATCH_TIME = 100 // the maximum amount of ms allowed for counting matches

type ActiveSearchOption =
  | 'caseSensitive'
  | 'regexp'
  | 'wholeWord'
  | 'withinSelection'
  | null

type MatchPositions = {
  current: number | null
  total: number
  interrupted: boolean
}

const CodeMirrorSearchForm: FC = () => {
  const view = useCodeMirrorViewContext()
  const state = useCodeMirrorStateContext()

  const [keybindings] = useScopeValue<string>('settings.mode')
  const emacsKeybindingsActive = keybindings === 'emacs'
  const [activeSearchOption, setActiveSearchOption] =
    useState<ActiveSearchOption>(null)

  // Generate random ID for option buttons. This is necessary because the label
  // for each checkbox is separated from it in the DOM so that the buttons can
  // be outside the natural tab order
  const idSuffix = useMemo(() => Math.random().toString(16).slice(2), [])
  const caseSensitiveId = 'caseSensitive' + idSuffix
  const regexpId = 'regexp' + idSuffix
  const wholeWordId = 'wholeWord' + idSuffix
  const withinSelectionId = 'withinSelection' + idSuffix

  const { t } = useTranslation()

  const [position, setPosition] = useState<MatchPositions | null>(null)

  const formRef = useRef<HTMLFormElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const replaceRef = useRef<HTMLInputElement | null>(null)

  const handleInputRef = useCallback(node => {
    inputRef.current = node

    // focus the search input when the panel opens
    if (node) {
      node.select()
      node.focus()
    }
  }, [])

  const handleReplaceRef = useCallback(node => {
    replaceRef.current = node
  }, [])

  const handleSubmit = useCallback(event => {
    event.preventDefault()
  }, [])

  useEffect(() => {
    buildPosition(state, setPosition)
  }, [state])

  const handleChange = useCallback(() => {
    if (formRef.current) {
      const data = Object.fromEntries(new FormData(formRef.current))

      const query = new SearchQuery({
        search: data.search as string,
        replace: data.replace as string,
        caseSensitive: data.caseSensitive === 'on',
        regexp: data.regexp === 'on',
        literal: true,
        wholeWord: data.wholeWord === 'on',
        scope: getStoredSelection(view.state)?.ranges,
      })

      view.dispatch({ effects: setSearchQuery.of(query) })
    }
  }, [view])

  const handleWithinSelectionChange = useCallback(() => {
    const storedSelection = getStoredSelection(state)
    view.dispatch(setStoredSelection(storedSelection ? null : state.selection))
    handleChange()
  }, [handleChange, state, view])

  const handleFormKeyDown = useCallback(
    event => {
      if (runScopeHandlers(view, event, 'search-panel')) {
        event.preventDefault()
      }
    },
    [view]
  )

  // Returns true if the event was handled, false otherwise
  const handleEmacsNavigation = useCallback(
    event => {
      const emacsCtrlSeq =
        emacsKeybindingsActive &&
        event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey

      if (!emacsCtrlSeq) {
        return false
      }

      switch (event.key) {
        case 's': {
          event.stopPropagation()
          event.preventDefault()
          findNext(view)
          return true
        }
        case 'r': {
          event.stopPropagation()
          event.preventDefault()
          findPrevious(view)
          return true
        }
        case 'g': {
          event.stopPropagation()
          event.preventDefault()
          closeSearchPanel(view)
          document.dispatchEvent(new CustomEvent('cm:emacs-close-search-panel'))
          return true
        }
        default: {
          return false
        }
      }
    },
    [view, emacsKeybindingsActive]
  )

  const handleSearchKeyDown = useCallback(
    event => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          if (emacsKeybindingsActive) {
            closeSearchPanel(view)
            view.dispatch({
              selection: EditorSelection.cursor(view.state.selection.main.to),
            })
          } else if (event.shiftKey) {
            findPrevious(view)
          } else {
            findNext(view)
          }
          break
      }
      handleEmacsNavigation(event)
    },
    [view, handleEmacsNavigation, emacsKeybindingsActive]
  )

  const handleReplaceKeyDown = useCallback(
    event => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          replaceNext(view)
          break

        case 'Tab': {
          if (event.shiftKey) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }
      }
      handleEmacsNavigation(event)
    },
    [view, handleEmacsNavigation]
  )

  const focusSearchBox = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const query = useMemo(() => {
    return getSearchQuery(state)
  }, [state])

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      className="ol-cm-search-form"
      role="search"
    >
      <div className="ol-cm-search-controls">
        <InputGroup
          bsSize="small"
          className={classnames('ol-cm-search-input-group', {
            'ol-cm-search-input-error':
              query.regexp && isInvalidRegExp(query.search),
          })}
        >
          <FormControl
            type="text"
            name="search"
            // IMPORTANT: CodeMirror uses this attribute to focus the input
            // when the panel opens and when the panel is refocused
            main-field="true"
            placeholder={t('search_search_for')}
            autoComplete="off"
            value={query.search || ''}
            onChange={handleChange}
            onKeyDown={handleSearchKeyDown}
            className="ol-cm-search-form-input"
            bsSize="small"
            inputRef={handleInputRef}
            aria-label={t('search_command_find')}
          />

          <InputGroup.Button>
            <Tooltip
              id="search-match-case"
              description={t('search_match_case')}
            >
              <label
                className={classnames(
                  'btn btn-sm btn-default ol-cm-search-input-button',
                  {
                    checked: query.caseSensitive,
                    focused: activeSearchOption === 'caseSensitive',
                  }
                )}
                htmlFor={caseSensitiveId}
                aria-label={t('search_match_case')}
              >
                Aa
              </label>
            </Tooltip>
          </InputGroup.Button>

          <InputGroup.Button>
            <Tooltip id="search-regexp" description={t('search_regexp')}>
              <label
                className={classnames(
                  'btn btn-sm btn-default ol-cm-search-input-button',
                  {
                    checked: query.regexp,
                    focused: activeSearchOption === 'regexp',
                  }
                )}
                htmlFor={regexpId}
                aria-label={t('search_regexp')}
              >
                [.*]
              </label>
            </Tooltip>
          </InputGroup.Button>

          <InputGroup.Button>
            <Tooltip
              id="search-whole-word"
              description={t('search_whole_word')}
            >
              <label
                className={classnames(
                  'btn btn-sm btn-default ol-cm-search-input-button',
                  {
                    checked: query.wholeWord,
                    focused: activeSearchOption === 'wholeWord',
                  }
                )}
                htmlFor={wholeWordId}
                aria-label={t('search_whole_word')}
              >
                W
              </label>
            </Tooltip>
          </InputGroup.Button>

          <InputGroup.Button>
            <Tooltip
              id="search-within-selection"
              description={t('search_within_selection')}
            >
              <label
                className={classnames(
                  'btn btn-sm btn-default ol-cm-search-input-button',
                  {
                    checked: !!query.scope,
                    focused: activeSearchOption === 'withinSelection',
                  }
                )}
                htmlFor={withinSelectionId}
                aria-label={t('search_within_selection')}
              >
                <Icon type="align-left" fw />
              </label>
            </Tooltip>
          </InputGroup.Button>
        </InputGroup>

        <InputGroup
          bsSize="small"
          className="ol-cm-search-input-group ol-cm-search-replace-input"
        >
          <FormControl
            type="text"
            name="replace"
            placeholder={t('search_replace_with')}
            autoComplete="off"
            value={query.replace || ''}
            onChange={handleChange}
            onKeyDown={handleReplaceKeyDown}
            className="ol-cm-search-form-input"
            bsSize="small"
            inputRef={handleReplaceRef}
            aria-label={t('search_command_replace')}
          />
        </InputGroup>

        <div className="ol-cm-search-hidden-inputs">
          <input
            id={caseSensitiveId}
            name="caseSensitive"
            type="checkbox"
            checked={query.caseSensitive}
            onChange={handleChange}
            onClick={focusSearchBox}
            onFocus={() => setActiveSearchOption('caseSensitive')}
            onBlur={() => setActiveSearchOption(null)}
          />

          <input
            id={regexpId}
            name="regexp"
            type="checkbox"
            checked={query.regexp}
            onChange={handleChange}
            onClick={focusSearchBox}
            onFocus={() => setActiveSearchOption('regexp')}
            onBlur={() => setActiveSearchOption(null)}
          />

          <input
            id={wholeWordId}
            name="wholeWord"
            type="checkbox"
            checked={query.wholeWord}
            onChange={handleChange}
            onClick={focusSearchBox}
            onFocus={() => setActiveSearchOption('wholeWord')}
            onBlur={() => setActiveSearchOption(null)}
          />

          <input
            id={withinSelectionId}
            name="withinSelection"
            type="checkbox"
            checked={!!query.scope}
            onChange={handleWithinSelectionChange}
            onClick={focusSearchBox}
            onFocus={() => setActiveSearchOption('withinSelection')}
            onBlur={() => setActiveSearchOption(null)}
          />
        </div>

        <div className="ol-cm-search-form-group ol-cm-search-next-previous">
          <ButtonGroup className="ol-cm-search-form-button-group">
            <Button type="button" bsSize="small" onClick={() => findNext(view)}>
              <Icon
                type="chevron-down"
                fw
                accessibilityLabel={t('search_next')}
              />
            </Button>

            <Button
              type="button"
              bsSize="small"
              onClick={() => findPrevious(view)}
            >
              <Icon
                type="chevron-up"
                fw
                accessibilityLabel={t('search_previous')}
              />
            </Button>
          </ButtonGroup>

          {position !== null && (
            <div className="ol-cm-search-form-position">
              {position.current === null ? '?' : position.current} {t('of')}{' '}
              {position.total}
              {position.interrupted && '+'}
            </div>
          )}
        </div>

        <div className="ol-cm-search-form-group ol-cm-search-replace-buttons">
          <Button
            type="button"
            bsSize="small"
            onClick={() => replaceNext(view)}
          >
            {t('search_replace')}
          </Button>

          <Button type="button" bsSize="small" onClick={() => replaceAll(view)}>
            {t('search_replace_all')}
          </Button>
        </div>
      </div>

      <div className="ol-cm-search-form-close">
        <Tooltip id="search-close" description={<>{t('close')} (Esc)</>}>
          <button
            className="close"
            onClick={() => closeSearchPanel(view)}
            type="button"
            aria-label={t('close')}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </Tooltip>
      </div>
    </form>
  )
}

function isInvalidRegExp(source: string) {
  try {
    RegExp(source)
    return false
  } catch {
    return true
  }
}

export default CodeMirrorSearchForm

const buildPosition = debounce(
  (
    state: EditorState,
    setPosition: (position: MatchPositions | null) => void
  ) => {
    const { main } = state.selection

    const query = getSearchQuery(state)

    if (!query.valid) {
      return setPosition(null)
    }

    const cursor = query.getCursor(state.doc) as SearchCursor

    const startTime = Date.now()

    let total = 0
    let current = null

    while (!cursor.next().done) {
      total++

      // if there are too many matches, bail out
      if (total >= MAX_MATCH_COUNT) {
        return setPosition({
          current,
          total,
          interrupted: true,
        })
      }

      const { from, to } = cursor.value

      if (current === null && main.from === from && main.to === to) {
        current = total
      }

      // if finding matches is taking too long, bail out
      if (Date.now() - startTime > MAX_MATCH_TIME) {
        return setPosition({
          current,
          total,
          interrupted: true,
        })
      }
    }

    setPosition({
      current: current ?? 0,
      total,
      interrupted: false,
    })
  },
  MATCH_COUNT_DEBOUNCE_WAIT
)
