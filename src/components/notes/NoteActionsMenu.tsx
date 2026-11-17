'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Archive, Edit, MoreHorizontal, Star, Trash2 } from 'lucide-react'

interface NoteActionsMenuProps {
  title: string
  isFavorite: boolean
  isArchived: boolean
  onEdit: () => void
  onToggleFavorite: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

export default function NoteActionsMenu({
  title,
  isFavorite,
  isArchived,
  onEdit,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}: NoteActionsMenuProps) {
  const confirmDelete = () => {
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) onDelete()
  }

  return (
    <Menu as="div" className="relative shrink-0">
      <MenuButton
        type="button"
        className="app-notes-menu-button"
        aria-label={`Actions for ${title}`}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </MenuButton>
      <MenuItems className="app-notes-surface absolute right-0 z-30 mt-1 w-48 p-1 shadow-md focus:outline-none">
        <MenuItem>
          <button type="button" onClick={onEdit} className="app-notes-menu-item">
            <Edit size={15} aria-hidden="true" /> Edit
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" onClick={onToggleFavorite} className="app-notes-menu-item">
            <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
            {isFavorite ? 'Remove favorite' : 'Add to favorites'}
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" onClick={onToggleArchive} className="app-notes-menu-item">
            <Archive size={15} aria-hidden="true" /> {isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" onClick={confirmDelete} className="app-notes-menu-item app-notes-menu-item-danger">
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}