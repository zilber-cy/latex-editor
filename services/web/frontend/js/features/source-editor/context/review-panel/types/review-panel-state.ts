import {
  CommentId,
  ReviewPanelCommentThreads,
  ReviewPanelEntries,
  ReviewPanelPermissions,
  ReviewPanelUsers,
  SubView,
  ThreadId,
} from '../../../../../../../types/review-panel/review-panel'
import {
  DocId,
  MainDocument,
} from '../../../../../../../types/project-settings'
import { dispatchReviewPanelLayout } from '../../../extensions/changes/change-manager'

/* eslint-disable no-use-before-define */
export interface ReviewPanelState {
  values: {
    collapsed: Record<DocId, boolean>
    commentThreads: ReviewPanelCommentThreads
    docs: MainDocument[] | undefined
    entries: ReviewPanelEntries
    entryHover: boolean
    isAddingComment: boolean
    loadingThreads: boolean
    nVisibleSelectedChanges: number
    permissions: ReviewPanelPermissions
    users: ReviewPanelUsers
    resolvedComments: ReviewPanelEntries
    shouldCollapse: boolean
    navHeight: number
    toolbarHeight: number
    subView: SubView
    wantTrackChanges: boolean
    loading: boolean
    openDocId: DocId | null
    lineHeight: number
    trackChangesState: Record<string, { value: boolean; syncState: string }>
    trackChangesOnForEveryone: boolean
    trackChangesOnForGuests: boolean
    trackChangesForGuestsAvailable: boolean
    formattedProjectMembers: Record<
      string,
      {
        id: string
        name: string
      }
    >
    layoutSuspended: boolean
  }
  updaterFns: {
    handleSetSubview: (subView: SubView) => void
    handleLayoutChange: (
      ...args: Parameters<typeof dispatchReviewPanelLayout>
    ) => void
    gotoEntry: (docId: DocId, entryOffset: number) => void
    resolveComment: (docId: DocId, entryId: ThreadId) => void
    deleteComment: (threadId: ThreadId, commentId: CommentId) => void
    submitReply: (threadId: ThreadId, replyContent: string) => void
    acceptChanges: (entryIds: unknown) => void
    rejectChanges: (entryIds: unknown) => void
    toggleTrackChangesForEveryone: (isOn: boolean) => unknown
    toggleTrackChangesForUser: (isOn: boolean, memberId: string) => unknown
    toggleTrackChangesForGuests: (isOn: boolean) => unknown
    toggleReviewPanel: () => void
    bulkAcceptActions: () => void
    bulkRejectActions: () => void
    saveEdit: (
      threadId: ThreadId,
      commentId: CommentId,
      content: string
    ) => void
    unresolveComment: (threadId: ThreadId) => void
    deleteThread: (_entryId: unknown, docId: DocId, threadId: ThreadId) => void
    refreshResolvedCommentsDropdown: () => Promise<void>
    submitNewComment: (content: string) => void
    setEntryHover: React.Dispatch<React.SetStateAction<Value<'entryHover'>>>
    setIsAddingComment: React.Dispatch<
      React.SetStateAction<Value<'isAddingComment'>>
    >
    setCollapsed: React.Dispatch<React.SetStateAction<Value<'collapsed'>>>
    setShouldCollapse: React.Dispatch<
      React.SetStateAction<Value<'shouldCollapse'>>
    >
    setNavHeight: React.Dispatch<React.SetStateAction<Value<'navHeight'>>>
    setToolbarHeight: React.Dispatch<
      React.SetStateAction<Value<'toolbarHeight'>>
    >
    setLayoutSuspended: React.Dispatch<
      React.SetStateAction<Value<'layoutSuspended'>>
    >
  }
}
/* eslint-enable no-use-before-define */

// Getter for values
export type Value<T extends keyof ReviewPanelState['values']> =
  ReviewPanelState['values'][T]

// Getter for stable functions
export type UpdaterFn<T extends keyof ReviewPanelState['updaterFns']> =
  ReviewPanelState['updaterFns'][T]
