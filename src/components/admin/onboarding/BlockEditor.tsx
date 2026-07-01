import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableBlock } from './SortableBlock'

export function BlockEditor({ blocks, blockTemplates, language, onChange  }: any) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex((b: any) => b.block_key === active.id)
    const newIndex = blocks.findIndex((b: any) => b.block_key === over.id)
    onChange(arrayMove(blocks, oldIndex, newIndex))
  }

  const handleToggle = (blockKey) => {
    onChange(
      blocks.map((b: any) =>
        b.block_key === blockKey ? { ...b, enabled: !b.enabled } : b
      )
    )
  }

  const handleContentChange = (blockKey, contentKey, value) => {
    onChange(
      blocks.map((b: any) =>
        b.block_key === blockKey ? { ...b, [contentKey]: value } : b
      )
    )
  }

  const handleOptionChange = (blockKey, options) => {
    onChange(
      blocks.map((b: any) =>
        b.block_key === blockKey ? { ...b, options } : b
      )
    )
  }

  const getTemplate = (blockKey) =>
    blockTemplates.find((t: any) => t.block_key === blockKey)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext
        items={blocks.map((b: any) => b.block_key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {blocks.map((block: any) => (
            <SortableBlock
              key={block.block_key}
              block={block}
              blockTemplate={getTemplate(block.block_key)}
              language={language}
              onToggle={() => handleToggle(block.block_key)}
              onContentChange={(key, val) => handleContentChange(block.block_key, key, val)}
              onOptionChange={(opts: any) => handleOptionChange(block.block_key, opts)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
