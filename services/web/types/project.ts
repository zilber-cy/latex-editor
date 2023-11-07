import { MongoUser } from './user'
import { Folder } from './folder'

type ProjectMember = {
  _id: string
  type: 'user'
  privileges: 'readOnly' | 'readAndWrite'
  name: string
  email: string
}

type ProjectInvite = {
  _id: string
  privileges: 'readOnly' | 'readAndWrite'
  name: string
  email: string
}

export type Project = {
  _id: string
  name: string
  features: Record<string, unknown>
  publicAccesLevel?: string
  tokens: Record<string, unknown>
  owner: MongoUser
  members: ProjectMember[]
  invites: ProjectInvite[]
  rootDoc_id?: string
  rootFolder?: Folder[]
}
