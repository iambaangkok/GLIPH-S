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
 */

import { useState } from 'react'
import { useStore } from './lib/StoreContext.tsx'
import { useSelection } from './lib/SelectionContext.tsx'
import { useDialog } from './DialogProvider.tsx'
import type { Project } from './lib/types.ts'

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
  const { state, updateThread, deleteThread, reorderThread } = useStore()
  const { setSelectedThreadId, selectedThreadId } = useSelection()
  const dialog = useDialog()

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

  function handleMoveUp() {
    if (index <= 0) return
    reorderThread(projectId, index, index - 1)
  }

  function handleMoveDown() {
    if (index >= threadIds.length - 1) return
    reorderThread(projectId, index, index + 1)
  }

  const isFirst = index === 0
  const isLast = index === threadIds.length - 1

  return (
    <div
      role="row"
      aria-selected={isSelected}
      data-selected={isSelected}
      className="nav-row"
      onClick={onSelect}
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
      }}
    >
      {/* thread indicator glyph */}
      <span style={{ opacity: 0.5, fontSize: 10, marginRight: 3 }}>└</span>

      {/* thread title — flex grow */}
      <span
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={thread.title}
      >
        {label}
      </span>

      {/* reorder controls */}
      <button
        type="button"
        aria-label="Move thread up"
        className="icon-btn"
        disabled={isFirst}
        onClick={(e) => { e.stopPropagation(); void handleMoveUp() }}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Move thread down"
        className="icon-btn"
        disabled={isLast}
        onClick={(e) => { e.stopPropagation(); void handleMoveDown() }}
      >
        ▼
      </button>

      {/* rename */}
      <button
        type="button"
        aria-label="Rename thread"
        className="icon-btn"
        onClick={(e) => { e.stopPropagation(); void handleRename() }}
      >
        ✎
      </button>

      {/* delete */}
      <button
        type="button"
        aria-label="Delete thread"
        className="icon-btn icon-btn--danger"
        onClick={(e) => { e.stopPropagation(); void handleDelete() }}
      >
        ×
      </button>
    </div>
  )
}

// ── ProjectGroup ──────────────────────────────────────────────────────────────

interface ProjectGroupProps {
  project: Project
  isLast: boolean
}

function ProjectGroup({ project, isLast }: ProjectGroupProps) {
  const { state, createThread, renameProject, deleteProject } = useStore()
  const { selectedThreadId, setSelectedThreadId } = useSelection()
  const dialog = useDialog()

  const [collapsed, setCollapsed] = useState(false)

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

  return (
    <div style={{ marginBottom: isLast ? 0 : 4 }}>
      {/* Project header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 2,
        }}
      >
        {/* collapse toggle + label */}
        <button
          type="button"
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
          className="nav-project-toggle"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span className="label-mono" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {collapsed ? '▸' : '▾'} {label}
          </span>
        </button>

        {/* add thread chip */}
        <button
          type="button"
          aria-label={`Add thread to ${label}`}
          onClick={() => void handleAddThread()}
          className="chip"
          style={{ flexShrink: 0 }}
        >
          + thread
        </button>

        {/* rename — hidden for Unfiled (locked) */}
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

        {/* delete — hidden for Unfiled (locked) */}
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
      </div>

      {/* Thread list */}
      {!collapsed && (
        <div role="rowgroup">
          {threadIds.length === 0 && (
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
              — empty —
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

      {/* hairline rule between project groups */}
      {!isLast && <div className="ruler" style={{ margin: '8px 0 6px' }} />}
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
          onClick={() => void handleAddProject()}
          className="chip chip--accent"
        >
          + project
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
      </div>
    </div>
  )
}
