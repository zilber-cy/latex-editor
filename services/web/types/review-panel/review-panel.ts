import { Brand } from '../helpers/brand'
import { DocId } from '../project-settings'
import {
  ReviewPanelAddCommentEntry,
  ReviewPanelBulkActionsEntry,
  ReviewPanelEntry,
} from './entry'
import { ReviewPanelCommentThread } from './comment-thread'

export type SubView = 'cur_file' | 'overview'

export interface ReviewPanelPermissions {
  read: boolean
  write: boolean
  admin: boolean
  comment: boolean
}

export type ThreadId = Brand<string, 'ThreadId'>
// Entries may contain `add-comment` and `bulk-actions` props along with DocIds
// Ideally the `add-comment` and `bulk-actions` objects should not be within the entries object
// as the doc data, but this is what currently angular returns.
export type ReviewPanelDocEntries = Record<
  | ThreadId
  | ReviewPanelAddCommentEntry['type']
  | ReviewPanelBulkActionsEntry['type'],
  ReviewPanelEntry
>

export type ReviewPanelEntries = Record<DocId, ReviewPanelDocEntries>

export type UserId = Brand<string, 'UserId'>

export interface ReviewPanelUser {
  avatar_text: string
  email: string
  hue: number
  id: UserId
  isSelf: boolean
  name: string
}

export type ReviewPanelUsers = Record<UserId, ReviewPanelUser>

export type CommentId = Brand<string, 'CommentId'>

export interface ReviewPanelCommentThreadMessage {
  content: string
  id: CommentId
  timestamp: number
  user: ReviewPanelUser
  user_id: UserId
}

export type ReviewPanelCommentThreads = Record<
  ThreadId,
  ReviewPanelCommentThread
>
