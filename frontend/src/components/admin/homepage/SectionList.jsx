// ============================================
// FILE: frontend/src/components/admin/homepage/SectionList.jsx
// Draggable list of homepage sections
// ============================================

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useHomeLayoutStore } from "@/store/homeLayoutStore";
import SectionItem from "./SectionItem";
import SectionEditorModal from "./SectionEditorModal";

const SectionList = ({ sections }) => {
  const { reorderSections } = useHomeLayoutStore();
  const [editingSection, setEditingSection] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({
          ...section,
          order: index + 1,
        })
      );

      reorderSections(newSections);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                onEdit={() => setEditingSection(section)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Editor Modal */}
      <SectionEditorModal
        section={editingSection}
        open={!!editingSection}
        onClose={() => setEditingSection(null)}
      />
    </>
  );
};

export default SectionList;
