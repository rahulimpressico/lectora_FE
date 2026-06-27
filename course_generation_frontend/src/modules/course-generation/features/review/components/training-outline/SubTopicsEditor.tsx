import { useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2, Layers } from 'lucide-react'
import type { CSSProperties } from 'react'

interface SubTopicsEditorProps {
  subTopics: string[]
  onChange: (updated: string[]) => void
}

export const SubTopicsEditor = ({ subTopics, onChange }: SubTopicsEditorProps) => {
  const handleEdit = useCallback(
    (idx: number, value: string) => {
      const next = [...subTopics]
      next[idx] = value
      onChange(next)
    },
    [subTopics, onChange],
  )

  const handleAdd = useCallback(
    () => onChange([...subTopics, '']),
    [subTopics, onChange],
  )

  const handleRemove = useCallback(
    (idx: number) => onChange(subTopics.filter((_, i) => i !== idx)),
    [subTopics, onChange],
  )

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || result.destination.index === result.source.index) return
      const next = [...subTopics]
      const [moved] = next.splice(result.source.index, 1)
      next.splice(result.destination.index, 0, moved)
      onChange(next)
    },
    [subTopics, onChange],
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Layers size={12} className="text-indigo-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600">Sub-Topics</span>
        {subTopics.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
            {subTopics.length}
          </span>
        )}
      </div>

      {subTopics.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">No sub-topics yet — add one below.</p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subtopics">
          {(droppable) => (
            <div
              ref={droppable.innerRef}
              {...droppable.droppableProps}
              className="space-y-2"
            >
              {subTopics.map((st, idx) => (
                <Draggable key={`st-${idx}`} draggableId={`st-${idx}`} index={idx}>
                  {(draggable, snapshot) => (
                    <div
                      ref={draggable.innerRef}
                      {...draggable.draggableProps}
                      style={draggable.draggableProps.style as CSSProperties}
                      className={`flex items-center gap-1.5 rounded-lg transition-shadow ${
                        snapshot.isDragging ? 'shadow-md ring-1 ring-indigo-200 bg-white' : ''
                      }`}
                    >
                      {/* Drag handle */}
                      <div
                        {...draggable.dragHandleProps}
                        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical size={13} />
                      </div>

                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 shrink-0" />

                      <input
                        type="text"
                        value={st}
                        onChange={(e) => handleEdit(idx, e.target.value)}
                        placeholder={`Sub-topic ${idx + 1}…`}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemove(idx)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                        title="Remove sub-topic"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppable.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors pt-0.5"
      >
        <Plus size={12} />
        Add Sub-Topic
      </button>
    </div>
  )
}
