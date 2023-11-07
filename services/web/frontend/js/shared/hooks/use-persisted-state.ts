import {
  useState,
  useCallback,
  useEffect,
  SetStateAction,
  Dispatch,
} from 'react'
import _ from 'lodash'
import localStorage from '../../infrastructure/local-storage'

function usePersistedState<T = any>(
  key: string,
  defaultValue?: T,
  listen = false
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    return localStorage.getItem(key) ?? defaultValue
  })

  const updateFunction = useCallback(
    (newValue: SetStateAction<T>) => {
      setValue(value => {
        const actualNewValue = _.isFunction(newValue)
          ? newValue(value)
          : newValue

        if (actualNewValue === defaultValue) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, actualNewValue)
        }

        return actualNewValue
      })
    },
    [key, defaultValue]
  )

  useEffect(() => {
    if (listen) {
      const listener = (event: StorageEvent) => {
        if (event.key === key) {
          // note: this value is read via getItem rather than from event.newValue
          // because getItem handles deserializing the JSON that's stored in localStorage.
          setValue(localStorage.getItem(key) ?? defaultValue)
        }
      }

      window.addEventListener('storage', listener)

      return () => {
        window.removeEventListener('storage', listener)
      }
    }
  }, [key, listen, defaultValue])

  return [value, updateFunction]
}

export default usePersistedState
