import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LANG = window.i18n.currentLangCode

// Since we are rendering React from Angular, the initialisation is
// synchronous on page load (but hidden behind the loading screen). This
// means that translations must be initialised without any actual
// translation strings, and load those manually ourselves later

i18n.use(initReactI18next).init({
  lng: LANG,

  react: {
    // Since we are manually waiting on the translations data to
    // load, we don't need to use Suspense
    useSuspense: false,

    // Trigger a re-render when a language is added. Since we load the
    // translation strings asynchronously, we need to trigger a re-render once
    // they've loaded
    bindI18nStore: 'added',
  },

  interpolation: {
    // We use the legacy v1 JSON format, so configure interpolator to use
    // underscores instead of curly braces
    prefix: '__',
    suffix: '__',
    unescapeSuffix: 'HTML',

    // Disable nesting in interpolated values, preventing user input
    // injection via another nested value
    skipOnVariables: true,

    defaultVariables: {
      appName: window.ExposedSettings.appName,
    },
  },
})

// The webpackChunkName here will name this chunk (and thus the requested
// script) according to the file name. See https://webpack.js.org/api/module-methods/#magic-comments
// for details
const localesPromise = import(
  /* webpackChunkName: "[request]" */ `../../locales/${LANG}.json`
).then(lang => {
  i18n.addResourceBundle(LANG, 'translation', lang)
})

export default localesPromise
