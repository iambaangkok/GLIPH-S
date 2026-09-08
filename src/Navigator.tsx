/**
 * Project / Thread navigator — left pane (ticket 9).
 *
 * Renders the full Project › Thread hierarchy with V7.4 treatment:
 *   • grotesque `.label-mono` group labels
 *   • `.chip` / `.chip--accent` stadium pills for actions
 *   • `.ruler` hairline rules between project groups
 *   • `--sel` selected-row highlight on the active thread
 *
 * Behaviour:
 *   • Projects: create, rename (prompt), delete (cascade). Unfiled is locked.
 *   • Threads: create under a project, rename (prompt), delete, reorder (↑/↓).
 *   • Clicking a thread row sets it as the selectedThreadId in SelectionContext.
 *   • Deleting the currently selected thread clears selection.
 *   • Templates (ticket 12): a section below the projects. Clicking a template
 *     opens it in the center editor (it "behaves like a Post"); each row also
 *     carries a copy button (copies the snippet, flashes "copied"), rename and
 *     delete. Templates and threads are mutually-exclusive selections.
 */

import { useState, type DragEvent } from 'react'
import { useStore } from './lib/StoreContext.tsx'
import { useSelection } from './lib/SelectionContext.tsx'
import { useDialog } from './DialogProvider.tsx'
import type { Project } from './lib/types.ts'
import {
  THREAD_MIME,
  TEMPLATE_MIME,
  dropHalf,
  dropShadow,
  type DropHalf,
} from './lib/dnd.ts'

// ── Sub-components ─────────────────────────────────────────────────────────────

interface ThreadRowProps {
  threadId: string
  projectId: string
  threadIds: string[]
  index: number
  isSelected: boolean
  onSelect: () => void
}

function ThreadRow({
  threadId,
  projectId,
  threadIds,
  index,
  isSelected,
  onSelect,
}: ThreadRowProps) {
  const { state, updateThread, deleteThread, moveThread } = useStore()
  const { setSelectedThreadId, selectedThreadId } = useSelection()
  const dialog = useDialog()

  const [dragOver, setDragOver] = useState<DropHalf | null>(null)
  const [dragging, setDragging] = useState(false)

  const thread = state.threads[threadId]
  if (!thread) return null

  const label = thread.title.trim() === '' ? '(untitled)' : thread.title

  async function handleRename() {
    const next = await dialog.prompt({
      title: 'Rename thread',
      initialValue: thread.title,
      placeholder: 'Thread title',
      confirmLabel: 'Rename',
    })
    if (next === null) return
    updateThread(threadId, { title: next.trim() })
  }

  async function handleDelete() {
    const ok = await dialog.confirm({
      title: 'Delete thread',
      message: `Delete “${label}”? Its posts are removed too.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteThread(threadId)
    if (selectedThreadId === threadId) setSelectedThreadId(null)
  }

  // ── Drag to reorder / move across projects ──────────────────────────────────
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData(THREAD_MIME, threadId)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes(THREAD_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(dropHalf(e))
  }

  function handleDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes(THREAD_MIME)) return
    e.preventDefault()
    const half = dragOver ?? dropHalf(e)
    setDragOver(null)
    const draggedId = e.dataTransfer.getData(THREAD_MIME)
    if (!draggedId || draggedId === threadId) return
    // 'before' this row, or 'after' == before the next row (null = end).
    const beforeId = half === 'before' ? threadId : (threadIds[index + 1] ?? null)
    if (beforeId === draggedId) return // dropping right where it already sits
    moveThread(draggedId, projectId, beforeId)
  }

  return (
    <div
      role="row"
      aria-selected={isSelected}
      data-selected={isSelected}
      className="nav-row"
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null)
      }}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        paddingLeft: 18,
        paddingRight: 6,
        paddingTop: 5,
        paddingBottom: 5,
        borderRadius: 'var(--radius)',
        fontSize: 12.5,
        cursor: 'pointer',
        userSelect: 'none',
        opacity: dragging ? 0.4 : 1,
        boxShadow: dropShadow(dragOver),
      }}
    >
      {/* drag handle — only this grip starts a drag (not the whole row) */}
      <span
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => { setDragging(false); setDragOver(null) }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag handle — drag to move thread"
        title="Drag to move"
        style={{ opacity: 0.5, fontSize: 11, marginRight: 3, cursor: 'grab' }}
      >
        ⠿
      </span>

      {/* thread title — flex grow */}
      <span
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={thread.title}
      >
        {label}
      </span>

      {/* action cluster — revealed on row hover / selection */}
      <span className="row-actions">
        <button
          type="button"
          aria-label="Rename thread"
          className="icon-btn"
          onClick={(e) => { e.stopPropagation(); void handleRename() }}
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="Delete thread"
          className="icon-btn icon-btn--danger"
          onClick={(e) => { e.stopPropagation(); void handleDelete() }}
        >
          ×
        </button>
      </span>
    </div>
  )
}

// ── ProjectGroup ──────────────────────────────────────────────────────────────

interface ProjectGroupProps {
  project: Project
  isLast: boolean
}

function ProjectGroup({ project, isLast }: ProjectGroupProps) {
  const { state, createThread, renameProject, deleteProject, moveThread } = useStore()
  const { selectedThreadId, setSelectedThreadId } = useSelection()
  const dialog = useDialog()

  const [collapsed, setCollapsed] = useState(false)
  const [projDropOver, setProjDropOver] = useState(false)

  // Dropping a thread on the project header or its empty zone appends it to this
  // project (a cross-project move when it came from elsewhere).
  function handleProjectDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes(THREAD_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setProjDropOver(true)
  }

  function handleProjectDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes(THREAD_MIME)) return
    e.preventDefault()
    setProjDropOver(false)
    const draggedId = e.dataTransfer.getData(THREAD_MIME)
    if (!draggedId) return
    moveThread(draggedId, project.id, null)
  }

  const isDefault = project.isDefault
  const label = project.name

  async function handleRenameProject() {
    const next = await dialog.prompt({
      title: 'Rename project',
      initialValue: project.name,
      placeholder: 'Project name',
      confirmLabel: 'Rename',
    })
    if (next === null || next.trim() === '') return
    renameProject(project.id, next.trim())
  }

  async function handleDeleteProject() {
    const ok = await dialog.confirm({
      title: 'Delete project',
      message: `Delete “${label}” and all its threads?`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    // Clear selection if the selected thread belonged to this project.
    if (selectedThreadId && project.threadIds.includes(selectedThreadId)) {
      setSelectedThreadId(null)
    }
    deleteProject(project.id)
  }

  async function handleAddThread() {
    const title = await dialog.prompt({
      title: `New thread in ${label}`,
      placeholder: 'Thread title (optional)',
      confirmLabel: 'Create',
    })
    if (title === null) return
    const thread = createThread(project.id, title.trim())
    setSelectedThreadId(thread.id)
  }

  const threadIds = project.threadIds

  // Glyph reflects collapse state: filled ◈ when open, hollow ◇ when collapsed.
  const glyph = collapsed ? '◇' : '◈'
  // Active project = the one holding the currently selected thread (prototype `.sel`).
  const isActive = selectedThreadId !== null && project.threadIds.includes(selectedThreadId)

  return (
    <div className="nav-project" style={{ marginBottom: isLast ? 0 : 4 }}>
      {/* Project header row — also a drop target (append to this project) */}
      <div
        onDragOver={handleProjectDragOver}
        onDragLeave={() => setProjDropOver(false)}
        onDrop={handleProjectDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 2,
          borderRadius: 'var(--radius)',
          boxShadow: projDropOver ? 'inset 0 0 0 1px var(--accent)' : undefined,
        }}
      >
        {/* collapse toggle + label (glyph + name — prototype `◈ Launch teasers`) */}
        <button
          type="button"
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
          className="nav-project-toggle"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: isActive ? 'var(--sel)' : 'none',
            border: 'none',
            padding: '3px 6px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            className="label-mono"
            style={{
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isActive ? 'var(--accent)' : undefined,
              fontWeight: isActive ? 700 : undefined,
            }}
          >
            <span style={{ marginRight: 6, opacity: isActive ? 1 : 0.7 }}>{glyph}</span>{label}
          </span>
        </button>

        {/* action cluster — revealed on project hover */}
        <span className="proj-actions">
          <button
            type="button"
            aria-label={`Add thread to ${label}`}
            className="icon-btn"
            onClick={() => void handleAddThread()}
          >
            +
          </button>

          {/* rename / delete — hidden for Unfiled (locked) */}
          {!isDefault && (
            <button
              type="button"
              aria-label={`Rename project ${label}`}
              className="icon-btn"
              onClick={() => void handleRenameProject()}
            >
              ✎
            </button>
          )}
          {!isDefault && (
            <button
              type="button"
              aria-label={`Delete project ${label}`}
              className="icon-btn icon-btn--danger"
              onClick={() => void handleDeleteProject()}
            >
              ×
            </button>
          )}
        </span>
      </div>

      {/* Thread list */}
      {!collapsed && (
        <div role="rowgroup">
          {threadIds.length === 0 && (
            <div
              onDragOver={handleProjectDragOver}
              onDragLeave={() => setProjDropOver(false)}
              onDrop={handleProjectDrop}
              style={{
                paddingLeft: 18,
                paddingTop: 4,
                paddingBottom: 4,
                fontSize: 11,
                color: 'var(--line)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                borderRadius: 'var(--radius)',
                boxShadow: projDropOver ? 'inset 0 0 0 1px var(--accent)' : undefined,
              }}
            >
              — empty · drop here —
            </div>
          )}
          {threadIds.map((tid, idx) => {
            const thread = state.threads[tid]
            if (!thread) return null
            return (
              <ThreadRow
                key={tid}
                threadId={tid}
                projectId={project.id}
                threadIds={threadIds}
                index={idx}
                isSelected={selectedThreadId === tid}
                onSelect={() => setSelectedThreadId(tid)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TemplateRow ─────────────────────────────────────────────────────────────────

/**
 * One template in the Templates section. Clicking the row opens it in the
 * center editor (a template "behaves like a Post"). Actions: copy the snippet
 * to the clipboard (flashes "copied"), rename (prompt), delete (confirm).
 */
function TemplateRow({ templateId, nextId }: { templateId: string; nextId: string | null }) {
  const { state, updateTemplate, deleteTemplate, reorderTemplate } = useStore()
  const { selectedTemplateId, setSelectedTemplateId } = useSelection()
  const dialog = useDialog()

  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState<DropHalf | null>(null)
  const [dragging, setDragging] = useState(false)

  const template = state.templates[templateId]
  if (!template) return null

  const label = template.name.trim() === '' ? '(untitled)' : template.name
  const isSelected = selectedTemplateId === templateId

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(template.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (insecure context / denied) — silently ignore.
    }
  }

  async function handleRename() {
    const next = await dialog.prompt({
      title: 'Rename template',
      initialValue: template.name,
      placeholder: 'Template name',
      confirmLabel: 'Rename',
    })
    if (next === null) return
    updateTemplate(templateId, { name: next.trim() })
  }

  async function handleDelete() {
    const ok = await dialog.confirm({
      title: 'Delete template',
      message: `Delete “${label}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    deleteTemplate(templateId)
    if (selectedTemplateId === templateId) setSelectedTemplateId(null)
  }

  // ── Drag to reorder ─────────────────────────────────────────────────────────
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData(TEMPLATE_MIME, templateId)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes(TEMPLATE_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(dropHalf(e))
  }

  function handleDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes(TEMPLATE_MIME)) return
    e.preventDefault()
    const half = dragOver ?? dropHalf(e)
    setDragOver(null)
    const draggedId = e.dataTransfer.getData(TEMPLATE_MIME)
    if (!draggedId || draggedId === templateId) return
    const beforeId = half === 'before' ? templateId : nextId
    if (beforeId === draggedId) return
    reorderTemplate(draggedId, beforeId)
  }

  return (
    <div
      role="row"
      aria-selected={isSelected}
      data-selected={isSelected}
      className="nav-row"
      onClick={() => setSelectedTemplateId(templateId)}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null)
      }}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        paddingLeft: 18,
        paddingRight: 6,
        paddingTop: 5,
        paddingBottom: 5,
        borderRadius: 'var(--radius)',
        fontSize: 12.5,
        cursor: 'pointer',
        userSelect: 'none',
        opacity: dragging ? 0.4 : 1,
        boxShadow: dropShadow(dragOver),
      }}
    >
      {/* drag handle — only this grip starts a drag (not the whole row) */}
      <span
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => { setDragging(false); setDragOver(null) }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag handle — drag to reorder template"
        title="Drag to reorder"
        style={{ opacity: 0.5, fontSize: 11, marginRight: 3, cursor: 'grab' }}
      >
        ⠿
      </span>
      {/* template indicator glyph (prototype ▤) */}
      <span style={{ opacity: 0.5, fontSize: 10, marginRight: 3 }}>▤</span>

      {/* template name — flex grow */}
      <span
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={template.name}
      >
        {label}
      </span>

      {/* Transient "copied" flash — kept outside row-actions so it stays
          visible after the pointer leaves the row. */}
      {copied && (
        <span
          className="label-mono"
          style={{ fontSize: 8.5, color: 'var(--accent)', marginRight: 2 }}
        >
          copied
        </span>
      )}

      {/* action cluster — revealed on row hover / selection */}
      <span className="row-actions">
        <button
          type="button"
          aria-label="Copy template to clipboard"
          title="Copy to clipboard"
          className="icon-btn"
          onClick={(e) => { e.stopPropagation(); void handleCopy() }}
        >
          ⧉
        </button>
        <button
          type="button"
          aria-label="Rename template"
          className="icon-btn"
          onClick={(e) => { e.stopPropagation(); void handleRename() }}
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="Delete template"
          className="icon-btn icon-btn--danger"
          onClick={(e) => { e.stopPropagation(); void handleDelete() }}
        >
          ×
        </button>
      </span>
    </div>
  )
}

// ── TemplatesSection ────────────────────────────────────────────────────────────

/**
 * Templates group in the left pane (prototype "Templates" section). Create a
 * template here (opens it in the editor); each row is a TemplateRow.
 */
function TemplatesSection() {
  const { state, createTemplate } = useStore()
  const { setSelectedTemplateId } = useSelection()
  const dialog = useDialog()

  const templates = Object.values(state.templates).sort((a, b) => a.order - b.order)

  async function handleAddTemplate() {
    const name = await dialog.prompt({
      title: 'New template',
      placeholder: 'Template name',
      confirmLabel: 'Create',
    })
    if (name === null) return
    const template = createTemplate(name.trim() || 'Untitled', '')
    // Open the fresh template in the center editor so it behaves like a Post.
    setSelectedTemplateId(template.id)
  }

  return (
    <div className="nav-templates" style={{ marginTop: 14 }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '0 4px 6px',
        }}
      >
        <span className="label-mono" style={{ flex: 1 }}>Templates</span>
        <button
          type="button"
          aria-label="Create new template"
          title="New template"
          onClick={() => void handleAddTemplate()}
          className="chip chip--accent"
        >
          +
        </button>
      </div>

      {templates.length === 0 ? (
        <div
          style={{
            paddingLeft: 18,
            paddingTop: 4,
            paddingBottom: 4,
            fontSize: 11,
            color: 'var(--line)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}
        >
          — no templates —
        </div>
      ) : (
        <div role="rowgroup">
          {templates.map((t, i) => (
            <TemplateRow
              key={t.id}
              templateId={t.id}
              nextId={templates[i + 1]?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Navigator (root export) ────────────────────────────────────────────────────

export function Navigator() {
  const { state, createProject } = useStore()
  const dialog = useDialog()

  // Sort: default (Unfiled) always last; others by createdAt ascending.
  const projects = Object.values(state.projects).sort((a, b) => {
    if (a.isDefault && !b.isDefault) return 1
    if (!a.isDefault && b.isDefault) return -1
    return a.createdAt - b.createdAt
  })

  async function handleAddProject() {
    const name = await dialog.prompt({
      title: 'New project',
      placeholder: 'Project name',
      confirmLabel: 'Create',
    })
    if (name === null || name.trim() === '') return
    createProject(name.trim())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '10px 4px 8px',
        }}
      >
        <span className="label-mono" style={{ flex: 1 }}>Projects</span>
        <button
          type="button"
          aria-label="Create new project"
          title="New project"
          onClick={() => void handleAddProject()}
          className="chip chip--accent"
        >
          +
        </button>
      </div>

      {/* Project groups */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {projects.map((project, idx) => (
          <ProjectGroup
            key={project.id}
            project={project}
            isLast={idx === projects.length - 1}
          />
        ))}

        {/* single terminal hairline — closes the projects section (V7.4) */}
        <div className="ruler" style={{ margin: '10px 0 0' }} />

        {/* Templates section — below projects, per the prototype. */}
        <TemplatesSection />
      </div>
    </div>
  )
}
