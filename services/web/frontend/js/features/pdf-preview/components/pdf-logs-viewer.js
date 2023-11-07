import { useTranslation } from 'react-i18next'
import { memo } from 'react'
import classnames from 'classnames'
import PdfValidationIssue from './pdf-validation-issue'
import StopOnFirstErrorPrompt from './stop-on-first-error-prompt'
import TimeoutUpgradePrompt from './timeout-upgrade-prompt'
import TimeoutUpgradePromptNew from './timeout-upgrade-prompt-new'
import PdfPreviewError from './pdf-preview-error'
import PdfClearCacheButton from './pdf-clear-cache-button'
import PdfDownloadFilesButton from './pdf-download-files-button'
import PdfLogsEntries from './pdf-logs-entries'
import withErrorBoundary from '../../../infrastructure/error-boundary'
import PdfPreviewErrorBoundaryFallback from './pdf-preview-error-boundary-fallback'
import PdfCodeCheckFailedNotice from './pdf-code-check-failed-notice'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'
import PdfLogEntry from './pdf-log-entry'

function PdfLogsViewer() {
  const {
    codeCheckFailed,
    error,
    logEntries,
    rawLog,
    validationIssues,
    showLogs,
    stoppedOnFirstError,
    showNewCompileTimeoutUI,
  } = useCompileContext()

  const { t } = useTranslation()

  return (
    <div className={classnames('logs-pane', { hidden: !showLogs })}>
      <div className="logs-pane-content">
        {codeCheckFailed && <PdfCodeCheckFailedNotice />}

        {stoppedOnFirstError && <StopOnFirstErrorPrompt />}

        {showNewCompileTimeoutUI && error === 'timedout' ? (
          <TimeoutUpgradePromptNew />
        ) : (
          <>
            {error && <PdfPreviewError error={error} />}
            {error === 'timedout' && <TimeoutUpgradePrompt />}
          </>
        )}

        {validationIssues &&
          Object.entries(validationIssues).map(([name, issue]) => (
            <PdfValidationIssue key={name} name={name} issue={issue} />
          ))}

        {logEntries?.all && (
          <PdfLogsEntries
            entries={logEntries.all}
            hasErrors={logEntries.errors.length > 0}
          />
        )}

        {rawLog && (
          <PdfLogEntry
            headerTitle={t('raw_logs')}
            rawContent={rawLog}
            entryAriaLabel={t('raw_logs_description')}
            level="raw"
          />
        )}

        <div className="logs-pane-actions">
          <PdfClearCacheButton />
          <PdfDownloadFilesButton />
        </div>
      </div>
    </div>
  )
}

export default withErrorBoundary(memo(PdfLogsViewer), () => (
  <PdfPreviewErrorBoundaryFallback type="logs" />
))
