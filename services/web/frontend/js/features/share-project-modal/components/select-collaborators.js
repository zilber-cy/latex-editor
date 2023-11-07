import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Trans, useTranslation } from 'react-i18next'
import { matchSorter } from 'match-sorter'
import { useCombobox } from 'downshift'
import classnames from 'classnames'

import Icon from '../../../shared/components/icon'

// Unicode characters in these Unicode groups:
//  "General Punctuation — Spaces"
//  "General Punctuation — Format character" (including zero-width spaces)
const matchAllSpaces =
  /[\u061C\u2000-\u200F\u202A-\u202E\u2060\u2066-\u2069\u2028\u2029\u202F]/g

export default function SelectCollaborators({
  loading,
  options,
  placeholder,
  multipleSelectionProps,
}) {
  const {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    selectedItems,
  } = multipleSelectionProps

  const [inputValue, setInputValue] = useState('')

  const selectedEmails = useMemo(
    () => selectedItems.map(item => item.email),
    [selectedItems]
  )

  const unselectedOptions = useMemo(
    () => options.filter(option => !selectedEmails.includes(option.email)),
    [options, selectedEmails]
  )

  const filteredOptions = useMemo(() => {
    if (inputValue === '') {
      return unselectedOptions
    }

    return matchSorter(unselectedOptions, inputValue, {
      keys: ['name', 'email'],
      threshold: matchSorter.rankings.CONTAINS,
      baseSort: (a, b) => {
        // Prefer server-side sorting for ties in the match ranking.
        return a.index - b.index > 0 ? 1 : -1
      },
    })
  }, [unselectedOptions, inputValue])

  const inputRef = useRef(null)

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      window.setTimeout(() => {
        inputRef.current.focus()
      }, 10)
    }
  }, [inputRef])

  const isValidInput = useMemo(() => {
    if (inputValue.includes('@')) {
      for (const selectedItem of selectedItems) {
        if (selectedItem.email === inputValue) {
          return false
        }
      }
    }

    return true
  }, [inputValue, selectedItems])

  const {
    isOpen,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps,
    reset,
  } = useCombobox({
    inputValue,
    defaultHighlightedIndex: 0,
    items: filteredOptions,
    itemToString: item => item && item.name,
    onStateChange: ({ inputValue, type, selectedItem }) => {
      switch (type) {
        // add a selected item on Enter (keypress), click or blur
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          if (selectedItem) {
            setInputValue('')
            addSelectedItem(selectedItem)
          }
          break
      }
    },
  })

  const addNewItem = useCallback(
    (_email, focus = true) => {
      const email = _email.replace(matchAllSpaces, '')

      if (
        isValidInput &&
        email.includes('@') &&
        !selectedEmails.includes(email)
      ) {
        addSelectedItem({
          email,
          display: email,
          type: 'user',
        })
        setInputValue('')
        reset()
        if (focus) {
          focusInput()
        }
        return true
      }
    },
    [addSelectedItem, selectedEmails, isValidInput, focusInput, reset]
  )

  // close and reset the menu when there are no matching items
  useEffect(() => {
    if (isOpen && filteredOptions.length === 0) {
      reset()
    }
  }, [reset, isOpen, filteredOptions.length])

  return (
    <div className="tags-input">
      {/* eslint-disable-next-line jsx-a11y/label-has-for */}
      <label className="small" {...getLabelProps()}>
        <Trans i18nKey="share_with_your_collabs" />
        &nbsp;
        {loading && <Icon type="refresh" spin />}
      </label>

      <div className="host">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
        <div {...getComboboxProps()} className="tags" onClick={focusInput}>
          {selectedItems.map((selectedItem, index) => (
            <SelectedItem
              key={`selected-item-${index}`}
              removeSelectedItem={removeSelectedItem}
              selectedItem={selectedItem}
              focusInput={focusInput}
              index={index}
              getSelectedItemProps={getSelectedItemProps}
            />
          ))}

          <input
            {...getInputProps(
              getDropdownProps({
                className: classnames({
                  input: true,
                  'invalid-tag': !isValidInput,
                }),
                type: 'email',
                placeholder,
                size: inputValue.length
                  ? inputValue.length + 5
                  : placeholder.length,
                ref: inputRef,
                // preventKeyAction: showDropdown,
                onBlur: () => {
                  // blur: if the dropdown isn't open, try to create a new item using inputValue
                  if (!isOpen) {
                    addNewItem(inputValue, false)
                  }
                },
                onChange: e => {
                  setInputValue(e.target.value)
                },
                onKeyDown: event => {
                  switch (event.key) {
                    case 'Enter':
                      // Enter: always prevent form submission
                      event.preventDefault()
                      event.stopPropagation()
                      break

                    case 'Tab':
                      // Tab: if the dropdown isn't open, try to create a new item using inputValue and prevent blur if successful
                      if (!isOpen && addNewItem(inputValue)) {
                        event.preventDefault()
                        event.stopPropagation()
                      }
                      break

                    case ',':
                      // comma: try to create a new item using inputValue
                      event.preventDefault()
                      addNewItem(inputValue)
                      break
                  }
                },
                onPaste: event => {
                  const data =
                    // modern browsers
                    event.clipboardData?.getData('text/plain') ??
                    // IE11
                    window.clipboardData?.getData('text')

                  if (data) {
                    const emails = data
                      .split(/[\r\n,; ]+/)
                      .filter(item => item.includes('@'))

                    if (emails.length) {
                      // pasted comma-separated email addresses
                      event.preventDefault()

                      for (const email of emails) {
                        addNewItem(email)
                      }
                    }
                  }
                },
              })
            )}
          />
        </div>

        <div className={classnames({ autocomplete: isOpen })}>
          <ul {...getMenuProps()} className="suggestion-list">
            {isOpen &&
              filteredOptions.map((item, index) => (
                <Option
                  key={item.email}
                  index={index}
                  item={item}
                  selected={index === highlightedIndex}
                  getItemProps={getItemProps}
                />
              ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
SelectCollaborators.propTypes = {
  loading: PropTypes.bool.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.string,
  multipleSelectionProps: PropTypes.shape({
    getSelectedItemProps: PropTypes.func.isRequired,
    getDropdownProps: PropTypes.func.isRequired,
    addSelectedItem: PropTypes.func.isRequired,
    removeSelectedItem: PropTypes.func.isRequired,
    selectedItems: PropTypes.array.isRequired,
  }).isRequired,
}

function Option({ selected, item, getItemProps, index }) {
  return (
    <li
      className={classnames('suggestion-item', { selected })}
      {...getItemProps({ item, index })}
    >
      <Icon type="user" fw />
      &nbsp;
      {item.display}
    </li>
  )
}
Option.propTypes = {
  selected: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    display: PropTypes.string.isRequired,
  }),
  index: PropTypes.number.isRequired,
  getItemProps: PropTypes.func.isRequired,
}

function SelectedItem({
  removeSelectedItem,
  selectedItem,
  focusInput,
  getSelectedItemProps,
  index,
}) {
  const { t } = useTranslation()

  const handleClick = useCallback(
    event => {
      event.preventDefault()
      event.stopPropagation()
      removeSelectedItem(selectedItem)
      focusInput()
    },
    [focusInput, removeSelectedItem, selectedItem]
  )

  return (
    <span
      className="tag-item"
      {...getSelectedItemProps({ selectedItem, index })}
    >
      <Icon type="user" fw />
      <span>{selectedItem.display}</span>
      <button
        type="button"
        className="remove-button btn-inline-link"
        aria-label={t('remove')}
        onClick={handleClick}
      >
        <Icon type="close" fw />
      </button>
    </span>
  )
}
SelectedItem.propTypes = {
  focusInput: PropTypes.func.isRequired,
  removeSelectedItem: PropTypes.func.isRequired,
  selectedItem: PropTypes.shape({
    display: PropTypes.string.isRequired,
  }),
  getSelectedItemProps: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
}
