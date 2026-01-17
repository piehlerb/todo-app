// ===== Constants =====
const COLORS = [
    { name: 'coral', value: '#E57373' },
    { name: 'amber', value: '#FFB74D' },
    { name: 'sage', value: '#81C784' },
    { name: 'sky', value: '#64B5F6' },
    { name: 'lavender', value: '#9575CD' },
    { name: 'rose', value: '#F06292' },
    { name: 'teal', value: '#4DB6AC' },
    { name: 'slate', value: '#78909C' }
];

const STORAGE_KEY = 'todo-pwa-data';

// ===== State =====
let state = {
    lists: [],
    currentListId: null
};

// ===== DOM Elements =====
const elements = {
    // Views
    homeView: document.getElementById('home-view'),
    listView: document.getElementById('list-view'),

    // Home
    listsContainer: document.getElementById('lists-container'),
    emptyHome: document.getElementById('empty-home'),
    fabAdd: document.getElementById('fab-add'),

    // List Detail
    backBtn: document.getElementById('back-btn'),
    listTitle: document.getElementById('list-title'),
    editListBtn: document.getElementById('edit-list-btn'),
    tasksContainer: document.getElementById('tasks-container'),
    emptyList: document.getElementById('empty-list'),
    completedSection: document.getElementById('completed-section'),
    completedToggle: document.getElementById('completed-toggle'),
    completedTasks: document.getElementById('completed-tasks'),
    completedCount: document.getElementById('completed-count'),
    newTaskInput: document.getElementById('new-task-input'),
    addTaskBtn: document.getElementById('add-task-btn'),

    // Quick Add Modal
    quickAddModal: document.getElementById('quick-add-modal'),
    quickTaskInput: document.getElementById('quick-task-input'),
    listOptions: document.getElementById('list-options'),
    createListBtn: document.getElementById('create-list-btn'),
    cancelQuickAdd: document.getElementById('cancel-quick-add'),
    confirmQuickAdd: document.getElementById('confirm-quick-add'),

    // List Modal
    listModal: document.getElementById('list-modal'),
    listModalTitle: document.getElementById('list-modal-title'),
    listNameInput: document.getElementById('list-name-input'),
    colorOptions: document.getElementById('color-options'),
    cancelListModal: document.getElementById('cancel-list-modal'),
    deleteListBtn: document.getElementById('delete-list-btn'),
    confirmListModal: document.getElementById('confirm-list-modal'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteMessage: document.getElementById('delete-message'),
    cancelDelete: document.getElementById('cancel-delete'),
    confirmDelete: document.getElementById('confirm-delete')
};

// Modal state
let modalState = {
    selectedListId: null,
    selectedColor: COLORS[0].value,
    editingListId: null,
    pendingDeleteListId: null
};

// ===== Storage =====
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
}

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return 'Today at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'long' }) + ' at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ===== Render Functions =====
function renderHome() {
    const activeLists = state.lists.filter(list => list.tasks.some(t => !t.completed));
    const emptyLists = state.lists.filter(list => !list.tasks.some(t => !t.completed));
    const allLists = [...activeLists, ...emptyLists]; // Show lists with active tasks first

    if (state.lists.length === 0) {
        elements.listsContainer.innerHTML = '';
        elements.emptyHome.classList.remove('hidden');
    } else {
        elements.emptyHome.classList.add('hidden');
        elements.listsContainer.innerHTML = state.lists.map(list => {
            const activeTasks = list.tasks.filter(t => !t.completed);
            const top3 = activeTasks.slice(0, 3);
            const remaining = activeTasks.length - 3;

            return `
                <div class="list-card" data-list-id="${list.id}" style="--list-color: ${list.color}" draggable="true">
                    <div class="list-card-header">
                        <span class="list-card-title">${escapeHtml(list.name)}</span>
                        <span class="list-card-count">${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    ${top3.length > 0 ? `
                        <div class="list-card-tasks">
                            ${top3.map(task => `
                                <div class="list-card-task">${escapeHtml(task.content)}</div>
                            `).join('')}
                        </div>
                        ${remaining > 0 ? `<div class="list-card-more">+${remaining} more</div>` : ''}
                    ` : `
                        <div class="list-card-tasks">
                            <div class="list-card-task" style="color: var(--text-tertiary); font-style: italic;">No active tasks</div>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        // Add drag and drop for list reordering
        setupListDragAndDrop();
    }
}

function renderListDetail() {
    const list = state.lists.find(l => l.id === state.currentListId);
    if (!list) return;

    // Update header
    elements.listTitle.textContent = list.name;
    document.querySelector('.list-header').style.borderBottomColor = list.color;

    // Active tasks
    const activeTasks = list.tasks.filter(t => !t.completed);
    const completedTasks = list.tasks.filter(t => t.completed);

    if (activeTasks.length === 0) {
        elements.tasksContainer.innerHTML = '';
        elements.emptyList.classList.remove('hidden');
    } else {
        elements.emptyList.classList.add('hidden');
        elements.tasksContainer.innerHTML = activeTasks.map(task => renderTaskItem(task, list.color)).join('');
        setupTaskDragAndDrop();
    }

    // Completed tasks
    if (completedTasks.length > 0) {
        elements.completedSection.classList.remove('hidden');
        elements.completedCount.textContent = completedTasks.length;
        elements.completedTasks.innerHTML = completedTasks
            .sort((a, b) => b.completedAt - a.completedAt) // Most recent first
            .map(task => renderTaskItem(task, list.color, true))
            .join('');
    } else {
        elements.completedSection.classList.add('hidden');
    }
}

function renderTaskItem(task, listColor, isCompleted = false) {
    return `
        <div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}" ${!isCompleted ? 'draggable="true"' : ''}>
            <div class="task-checkbox ${isCompleted ? 'checked' : ''}" style="--accent: ${listColor}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="task-text">
                <div class="task-content">${escapeHtml(task.content)}</div>
                ${isCompleted && task.completedAt ? `<div class="task-timestamp">Completed ${formatTimestamp(task.completedAt)}</div>` : ''}
            </div>
            ${!isCompleted ? `
                <div class="task-drag-handle">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5"></circle>
                        <circle cx="15" cy="6" r="1.5"></circle>
                        <circle cx="9" cy="12" r="1.5"></circle>
                        <circle cx="15" cy="12" r="1.5"></circle>
                        <circle cx="9" cy="18" r="1.5"></circle>
                        <circle cx="15" cy="18" r="1.5"></circle>
                    </svg>
                </div>
            ` : ''}
        </div>
    `;
}

function renderColorOptions(selectedColor = COLORS[0].value) {
    elements.colorOptions.innerHTML = COLORS.map(color => `
        <button class="color-option ${color.value === selectedColor ? 'selected' : ''}"
                data-color="${color.value}"
                style="background-color: ${color.value}"
                aria-label="${color.name}">
        </button>
    `).join('');
}

function renderListOptions() {
    elements.listOptions.innerHTML = state.lists.map(list => `
        <button class="list-option ${list.id === modalState.selectedListId ? 'selected' : ''}"
                data-list-id="${list.id}"
                style="--list-color: ${list.color}">
            ${escapeHtml(list.name)}
        </button>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Navigation =====
function showHome() {
    state.currentListId = null;
    elements.listView.classList.remove('active');
    elements.homeView.classList.add('active');
    renderHome();
}

function showList(listId) {
    state.currentListId = listId;
    elements.homeView.classList.remove('active');
    elements.listView.classList.add('active');
    renderListDetail();
    elements.newTaskInput.focus();
}

// ===== Modal Functions =====
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function openQuickAddModal() {
    modalState.selectedListId = state.lists.length > 0 ? state.lists[0].id : null;
    elements.quickTaskInput.value = '';
    renderListOptions();
    openModal(elements.quickAddModal);
    setTimeout(() => elements.quickTaskInput.focus(), 300);
}

function openListModal(editListId = null) {
    modalState.editingListId = editListId;

    if (editListId) {
        const list = state.lists.find(l => l.id === editListId);
        elements.listModalTitle.textContent = 'Edit List';
        elements.listNameInput.value = list.name;
        modalState.selectedColor = list.color;
        elements.confirmListModal.textContent = 'Save';
        elements.deleteListBtn.classList.remove('hidden');
    } else {
        elements.listModalTitle.textContent = 'New List';
        elements.listNameInput.value = '';
        modalState.selectedColor = COLORS[0].value;
        elements.confirmListModal.textContent = 'Create';
        elements.deleteListBtn.classList.add('hidden');
    }

    renderColorOptions(modalState.selectedColor);
    openModal(elements.listModal);
    setTimeout(() => elements.listNameInput.focus(), 300);
}

function openDeleteModal(listId) {
    modalState.pendingDeleteListId = listId;
    const list = state.lists.find(l => l.id === listId);
    const taskCount = list.tasks.length;
    elements.deleteMessage.textContent = taskCount > 0
        ? `This will delete "${list.name}" and all ${taskCount} task${taskCount !== 1 ? 's' : ''} in it.`
        : `This will delete "${list.name}".`;
    openModal(elements.deleteModal);
}

// ===== List Operations =====
function createList(name, color) {
    const list = {
        id: generateId(),
        name: name.trim(),
        color: color,
        tasks: [],
        createdAt: Date.now()
    };
    state.lists.push(list);
    saveState();
    return list;
}

function updateList(listId, name, color) {
    const list = state.lists.find(l => l.id === listId);
    if (list) {
        list.name = name.trim();
        list.color = color;
        saveState();
    }
}

function deleteList(listId) {
    state.lists = state.lists.filter(l => l.id !== listId);
    saveState();
    if (state.currentListId === listId) {
        showHome();
    }
}

function reorderLists(fromIndex, toIndex) {
    const [removed] = state.lists.splice(fromIndex, 1);
    state.lists.splice(toIndex, 0, removed);
    saveState();
}

// ===== Task Operations =====
function addTask(listId, content) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return null;

    const task = {
        id: generateId(),
        content: content.trim(),
        completed: false,
        createdAt: Date.now(),
        completedAt: null
    };

    // Add to beginning of list
    list.tasks.unshift(task);
    saveState();
    return task;
}

function toggleTask(taskId) {
    for (const list of state.lists) {
        const task = list.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? Date.now() : null;
            saveState();
            return task;
        }
    }
    return null;
}

function reorderTasks(listId, fromIndex, toIndex) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const activeTasks = list.tasks.filter(t => !t.completed);
    const completedTasks = list.tasks.filter(t => t.completed);

    const [removed] = activeTasks.splice(fromIndex, 1);
    activeTasks.splice(toIndex, 0, removed);

    list.tasks = [...activeTasks, ...completedTasks];
    saveState();
}

function moveTask(taskId, fromListId, toListId) {
    const fromList = state.lists.find(l => l.id === fromListId);
    const toList = state.lists.find(l => l.id === toListId);

    if (!fromList || !toList) return;

    const taskIndex = fromList.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const [task] = fromList.tasks.splice(taskIndex, 1);
    toList.tasks.unshift(task);
    saveState();
}

// ===== Drag and Drop =====
let draggedElement = null;
let draggedTaskId = null;
let draggedListId = null;

function setupListDragAndDrop() {
    const listCards = elements.listsContainer.querySelectorAll('.list-card');

    listCards.forEach((card, index) => {
        card.addEventListener('dragstart', (e) => {
            draggedElement = card;
            draggedListId = card.dataset.listId;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            listCards.forEach(c => c.classList.remove('drag-over'));
            draggedElement = null;
            draggedListId = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedElement && draggedElement !== card && draggedListId) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            if (draggedElement && draggedElement !== card && draggedListId) {
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = Array.from(listCards).indexOf(card);
                reorderLists(fromIndex, toIndex);
                renderHome();
            }
        });
    });
}

function setupTaskDragAndDrop() {
    const taskItems = elements.tasksContainer.querySelectorAll('.task-item');

    taskItems.forEach((item, index) => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            draggedTaskId = item.dataset.taskId;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            taskItems.forEach(t => t.classList.remove('drag-over'));
            draggedElement = null;
            draggedTaskId = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedElement && draggedElement !== item) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            if (draggedElement && draggedElement !== item) {
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = Array.from(taskItems).indexOf(item);
                reorderTasks(state.currentListId, fromIndex, toIndex);
                renderListDetail();
            }
        });
    });
}

// Touch drag and drop for mobile
let touchStartY = 0;
let touchDraggedElement = null;
let touchDraggedIndex = -1;
let touchPlaceholder = null;

function setupTouchDragAndDrop() {
    // Will implement touch-specific drag handling
    // For now, using the native drag API which works on desktop
    // Mobile will get tap-to-reorder in a future enhancement
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Home view
    elements.fabAdd.addEventListener('click', openQuickAddModal);

    elements.listsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.list-card');
        if (card && !e.target.closest('.drag-handle')) {
            showList(card.dataset.listId);
        }
    });

    // List view
    elements.backBtn.addEventListener('click', showHome);

    elements.editListBtn.addEventListener('click', () => {
        openListModal(state.currentListId);
    });

    elements.tasksContainer.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.task-checkbox');
        if (checkbox) {
            const taskItem = checkbox.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            taskItem.classList.add('completing');
            setTimeout(() => {
                toggleTask(taskId);
                renderListDetail();
            }, 200);
        }
    });

    elements.completedTasks.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.task-checkbox');
        if (checkbox) {
            const taskItem = checkbox.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            toggleTask(taskId);
            renderListDetail();
        }
    });

    elements.completedToggle.addEventListener('click', () => {
        elements.completedToggle.classList.toggle('expanded');
        elements.completedTasks.classList.toggle('expanded');
    });

    elements.addTaskBtn.addEventListener('click', () => {
        const content = elements.newTaskInput.value.trim();
        if (content && state.currentListId) {
            addTask(state.currentListId, content);
            elements.newTaskInput.value = '';
            renderListDetail();
        }
    });

    elements.newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.addTaskBtn.click();
        }
    });

    // Quick Add Modal
    elements.quickAddModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(elements.quickAddModal);
    });

    elements.cancelQuickAdd.addEventListener('click', () => {
        closeModal(elements.quickAddModal);
    });

    elements.listOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.list-option');
        if (option) {
            modalState.selectedListId = option.dataset.listId;
            renderListOptions();
        }
    });

    elements.createListBtn.addEventListener('click', () => {
        closeModal(elements.quickAddModal);
        openListModal();
    });

    elements.confirmQuickAdd.addEventListener('click', () => {
        const content = elements.quickTaskInput.value.trim();
        if (content && modalState.selectedListId) {
            addTask(modalState.selectedListId, content);
            closeModal(elements.quickAddModal);
            renderHome();
        } else if (content && !modalState.selectedListId) {
            // No lists exist, create one first
            closeModal(elements.quickAddModal);
            openListModal();
        }
    });

    elements.quickTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.confirmQuickAdd.click();
        }
    });

    // List Modal
    elements.listModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(elements.listModal);
    });

    elements.cancelListModal.addEventListener('click', () => {
        closeModal(elements.listModal);
    });

    elements.colorOptions.addEventListener('click', (e) => {
        const option = e.target.closest('.color-option');
        if (option) {
            modalState.selectedColor = option.dataset.color;
            renderColorOptions(modalState.selectedColor);
        }
    });

    elements.confirmListModal.addEventListener('click', () => {
        const name = elements.listNameInput.value.trim();
        if (!name) {
            elements.listNameInput.focus();
            return;
        }

        if (modalState.editingListId) {
            updateList(modalState.editingListId, name, modalState.selectedColor);
            closeModal(elements.listModal);
            if (state.currentListId) {
                renderListDetail();
            } else {
                renderHome();
            }
        } else {
            const newList = createList(name, modalState.selectedColor);
            closeModal(elements.listModal);
            // If we came from quick add, go back there with the new list selected
            if (elements.quickTaskInput.value.trim()) {
                modalState.selectedListId = newList.id;
                openQuickAddModal();
                elements.quickTaskInput.value = elements.quickTaskInput.value; // Preserve text
            } else {
                renderHome();
            }
        }
    });

    elements.listNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.confirmListModal.click();
        }
    });

    elements.deleteListBtn.addEventListener('click', () => {
        closeModal(elements.listModal);
        openDeleteModal(modalState.editingListId);
    });

    // Delete Modal
    elements.deleteModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(elements.deleteModal);
    });

    elements.cancelDelete.addEventListener('click', () => {
        closeModal(elements.deleteModal);
    });

    elements.confirmDelete.addEventListener('click', () => {
        if (modalState.pendingDeleteListId) {
            deleteList(modalState.pendingDeleteListId);
            closeModal(elements.deleteModal);
            renderHome();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.deleteModal.classList.contains('active')) {
                closeModal(elements.deleteModal);
            } else if (elements.listModal.classList.contains('active')) {
                closeModal(elements.listModal);
            } else if (elements.quickAddModal.classList.contains('active')) {
                closeModal(elements.quickAddModal);
            }
        }
    });
}

// ===== Service Worker Registration =====
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered:', registration.scope);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// ===== Initialize =====
function init() {
    loadState();
    renderHome();
    renderColorOptions();
    setupEventListeners();
    registerServiceWorker();

    // Add some demo data if empty (for testing)
    if (state.lists.length === 0) {
        // Uncomment below to add demo data:
        /*
        const personalList = createList('Personal', COLORS[0].value);
        addTask(personalList.id, 'Buy groceries for the week');
        addTask(personalList.id, 'Call mom');
        addTask(personalList.id, 'Schedule dentist appointment');

        const workList = createList('Work', COLORS[3].value);
        addTask(workList.id, 'Review pull request');
        addTask(workList.id, 'Prepare presentation slides');
        addTask(workList.id, 'Update project documentation');

        renderHome();
        */
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
