export interface EditorField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'boolean' | 'select' | 'list' | 'table' | 'image'
  required?: boolean
  options?: { value: string; label: string }[]
  columns?: string[]
  help?: string
}
export interface EditorSchema {
  version: 1
  fields: EditorField[]
  types: Record<string, { label: string; fields: EditorField[] }>
  sectionField?: string
  /** Parent page ID field; enables a read-only hierarchy with editable page content. */
  parentField?: string
}
export type EditorPage = Record<string, unknown> & { id: string; type: string; title: string }
export interface EditorDocument {
  file: string
  pages: EditorPage[]
}
export interface EditorBase {
  revision: string
  documents: EditorDocument[]
  assets: Record<string, string>
}
export interface EditorDraft extends EditorBase {
  /** New images keyed by project-relative path, never written until Save. */
  uploads: Record<string, string>
  /** Source content on which this draft was started; used for three-way merging. */
  base?: EditorBase
}
export interface EditorState extends EditorDraft {
  projectId: string
  title: string
  schema: EditorSchema
  assetsManifest?: string
  assetsDirectory?: string
}

export interface EditorDraftRecord {
  sessionId: string
  updatedAt: string
  draft: EditorDraft
}
