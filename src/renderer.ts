interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface StickyNote {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

type NoteElements = {
  note: HTMLDivElement;
  deleteButton: HTMLButtonElement;
};

const todoForm = document.getElementById('todo-form') as HTMLFormElement;
const todoInput = document.getElementById('todo-input') as HTMLInputElement;
const todoList = document.getElementById('todo-list') as HTMLUListElement;
const todoFilter = document.getElementById('todo-filter') as HTMLSelectElement;

const noteForm = document.getElementById('note-form') as HTMLFormElement;
const noteTextInput = document.getElementById('note-text') as HTMLTextAreaElement;
const noteColorInput = document.getElementById('note-color') as HTMLInputElement;
const noteBoard = document.getElementById('note-board') as HTMLDivElement;

let todoCounter = 0;
let noteCounter = 0;
const todos: TodoItem[] = [];
const notes: StickyNote[] = [];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const STORAGE_KEYS = {
  todos: 'desktop-todo-items',
  notes: 'desktop-sticky-notes',
} as const;

const storageAvailable = typeof window !== 'undefined' && 'localStorage' in window;

function saveToStorage<T>(key: string, value: T): void {
  if (!storageAvailable) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (!storageAvailable) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse stored ${key}`, error);
    return fallback;
  }
}

const getMaxId = (items: { id: number }[]) => items.reduce((max, item) => Math.max(max, item.id), 0);

function renderTodos(): void {
  todoList.innerHTML = '';
  const filterValue = todoFilter.value as 'all' | 'active' | 'completed';

  todos
    .filter((todo) => {
      if (filterValue === 'active') {
        return !todo.completed;
      }
      if (filterValue === 'completed') {
        return todo.completed;
      }
      return true;
    })
    .forEach((todo) => {
      const listItem = document.createElement('li');
      listItem.className = 'todo-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.completed;
      checkbox.setAttribute('aria-label', `Toggle ${todo.text}`);
      checkbox.addEventListener('change', () => {
        todo.completed = checkbox.checked;
        persistTodos();
        renderTodos();
      });

      const text = document.createElement('span');
      text.textContent = todo.text;
      text.className = todo.completed ? 'completed' : '';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-button';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Remove ${todo.text}`);
      deleteButton.addEventListener('click', () => {
        const index = todos.findIndex((item) => item.id === todo.id);
        if (index >= 0) {
          todos.splice(index, 1);
          persistTodos();
          renderTodos();
        }
      });

      listItem.appendChild(checkbox);
      listItem.appendChild(text);
      listItem.appendChild(deleteButton);
      todoList.appendChild(listItem);
    });
}

function attachDragBehaviour(noteElement: HTMLDivElement, note: StickyNote): void {
  noteElement.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.action === 'delete-note' || target.closest('[data-note-body="true"]')) {
      return;
    }

    if (noteElement.classList.contains('editing')) {
      return;
    }

    const bounding = noteElement.getBoundingClientRect();
    const boardRect = noteBoard.getBoundingClientRect();
    const offsetX = event.clientX - bounding.left;
    const offsetY = event.clientY - bounding.top;

    noteElement.setPointerCapture(event.pointerId);
    noteElement.classList.add('dragging');

    const handleMove = (moveEvent: PointerEvent) => {
      const newX = moveEvent.clientX - boardRect.left - offsetX;
      const newY = moveEvent.clientY - boardRect.top - offsetY;

      const maxX = Math.max(0, noteBoard.clientWidth - noteElement.offsetWidth);
      const maxY = Math.max(0, noteBoard.clientHeight - noteElement.offsetHeight);

      note.x = clamp(newX, 0, maxX);
      note.y = clamp(newY, 0, maxY);

      noteElement.style.left = `${note.x}px`;
      noteElement.style.top = `${note.y}px`;
    };

    const handleUp = (upEvent: PointerEvent) => {
      noteElement.classList.remove('dragging');
      noteElement.releasePointerCapture(upEvent.pointerId);
      noteElement.removeEventListener('pointermove', handleMove);
      noteElement.removeEventListener('pointerup', handleUp);
      noteElement.removeEventListener('pointercancel', handleUp);
      persistNotes();
    };

    noteElement.addEventListener('pointermove', handleMove);
    noteElement.addEventListener('pointerup', handleUp);
    noteElement.addEventListener('pointercancel', handleUp);
  });
}

function createNoteElement(note: StickyNote): NoteElements {
  const noteElement = document.createElement('div');
  noteElement.className = 'sticky-note';
  noteElement.style.backgroundColor = note.color;
  noteElement.style.left = `${note.x}px`;
  noteElement.style.top = `${note.y}px`;
  noteElement.dataset.noteId = String(note.id);
  noteElement.setAttribute('role', 'group');

  const header = document.createElement('div');
  header.className = 'note-header';

  const title = document.createElement('span');
  title.textContent = 'メモ';

  const deleteButton = document.createElement('button');
  deleteButton.textContent = '×';
  deleteButton.className = 'delete-note';
  deleteButton.dataset.action = 'delete-note';
  deleteButton.addEventListener('click', () => {
    const index = notes.findIndex((item) => item.id === note.id);
    if (index >= 0) {
      notes.splice(index, 1);
      noteBoard.removeChild(noteElement);
      persistNotes();
    }
  });

  header.appendChild(title);
  header.appendChild(deleteButton);

  const body = document.createElement('div');
  body.className = 'note-body';
  body.textContent = note.text;
  body.contentEditable = 'true';
  body.spellcheck = false;
  body.dataset.noteBody = 'true';
  body.setAttribute('role', 'textbox');
  body.setAttribute('aria-multiline', 'true');
  body.setAttribute('aria-label', 'メモ内容を編集');
  body.addEventListener('focus', () => {
    noteElement.classList.add('editing');
  });
  body.addEventListener('blur', () => {
    note.text = body.textContent ?? '';
    noteElement.classList.remove('editing');
    persistNotes();
  });
  body.addEventListener('input', () => {
    note.text = body.textContent ?? '';
    persistNotes();
  });
  body.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      body.blur();
    }
  });

  noteElement.appendChild(header);
  noteElement.appendChild(body);

  attachDragBehaviour(noteElement, note);

  return { note: noteElement, deleteButton };
}

function addStickyNote(text: string, color: string): void {
  const baseOffset = notes.length * 24;
  const boardWidth = noteBoard.clientWidth;
  const boardHeight = noteBoard.clientHeight;
  const maxX = Math.max(0, boardWidth - 220);
  const maxY = Math.max(0, boardHeight - 220);
  const initialX = maxX > 0 ? clamp(32 + (baseOffset % maxX), 0, maxX) : 32;
  const initialY = maxY > 0 ? clamp(32 + baseOffset, 0, maxY) : 32;

  const note: StickyNote = {
    id: ++noteCounter,
    text,
    color,
    x: initialX,
    y: initialY,
  };

  notes.push(note);

  const { note: noteElement } = createNoteElement(note);
  noteBoard.appendChild(noteElement);
  persistNotes();
}

function addTodo(text: string): void {
  const todo: TodoItem = {
    id: ++todoCounter,
    text,
    completed: false,
  };
  todos.push(todo);
  persistTodos();
  renderTodos();
}

if (todoForm && todoInput) {
  todoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = todoInput.value.trim();
    if (!value) {
      return;
    }
    addTodo(value);
    todoInput.value = '';
  });
}

todoFilter.addEventListener('change', () => {
  renderTodos();
});

if (noteForm && noteTextInput) {
  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = noteTextInput.value.trim();
    if (!value) {
      return;
    }
    const color = noteColorInput.value || '#fcd34d';
    addStickyNote(value, color);
    noteTextInput.value = '';
  });
}

function persistTodos(): void {
  saveToStorage(STORAGE_KEYS.todos, todos);
}

function persistNotes(): void {
  saveToStorage(STORAGE_KEYS.notes, notes);
}

function hydrateTodos(): boolean {
  const stored = loadFromStorage<TodoItem[]>(STORAGE_KEYS.todos, []);
  if (!stored.length) {
    return false;
  }

  todos.splice(0, todos.length, ...stored.map((item) => ({ ...item })));
  todoCounter = Math.max(todoCounter, getMaxId(todos));
  renderTodos();
  return true;
}

function hydrateNotes(): void {
  const stored = loadFromStorage<StickyNote[]>(STORAGE_KEYS.notes, []);
  if (!stored.length) {
    return;
  }

  const boardWidth = noteBoard.clientWidth;
  const boardHeight = noteBoard.clientHeight;
  const maxX = boardWidth ? Math.max(0, boardWidth - 220) : undefined;
  const maxY = boardHeight ? Math.max(0, boardHeight - 220) : undefined;

  stored.forEach((storedNote) => {
    const note: StickyNote = {
      ...storedNote,
      x: typeof maxX === 'number' ? clamp(storedNote.x, 0, maxX) : storedNote.x,
      y: typeof maxY === 'number' ? clamp(storedNote.y, 0, maxY) : storedNote.y,
    };

    notes.push(note);
    noteCounter = Math.max(noteCounter, note.id);
    const { note: noteElement } = createNoteElement(note);
    noteBoard.appendChild(noteElement);
  });
}

const hadStoredTodos = hydrateTodos();
if (!hadStoredTodos) {
  renderTodos();
}

hydrateNotes();
