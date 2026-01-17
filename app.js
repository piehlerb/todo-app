// ===== Supabase Configuration =====
const SUPABASE_URL = 'https://itkpkxtzxsuclfudznak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s2bHZPU8nv2nFBrZtpbEdw_wvwTrSKD';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

const LOCAL_STORAGE_KEY = 'todo-pwa-data';

// ===== State =====
let state = {
    lists: [],
    currentListId: null,
    user: null
};

// ===== DOM Elements =====
const elements = {
    // Views
    authView: document.getElementById('auth-view'),
    homeView: document.getElementById('home-view'),
    listView: document.getElementById('list-view'),

    // Auth
    authTabs: document.querySelectorAll('.auth-tab'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authSubmit: document.getElementById('auth-submit'),
    authGoogle: document.getElementById('auth-google'),
    authError: document.getElementById('auth-error'),

    // Home
    listsContainer: document.getElementById('lists-container'),
    emptyHome: document.getElementById('empty-home'),
    fabAdd: document.getElementById('fab-add'),
    userMenuBtn: document.getElementById('user-menu-btn'),

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
    confirmDelete: document.getElementById('confirm-delete'),

    // User Modal
    userModal: document.getElementById('user-modal'),
    userEmail: document.getElementById('user-email'),
    syncNowBtn: document.getElementById('sync-now-btn'),
    logoutBtn: document.getElementById('logout-btn'),

    // Sync Status
    syncStatus: document.getElementById('sync-status')
};

// Modal state
let modalState = {
    selectedListId: null,
    selectedColor: COLORS[0].value,
    editingListId: null,
    pendingDeleteListId: null,
    authMode: 'login'
};

// ===== Auth Functions =====
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        state.user = session.user;
        await loadFromSupabase();
        showHome();
    } else {
        showAuth();
    }
}

async function signUp(email, password) {
    showAuthError('');
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin
        }
    });

    if (error) {
        showAuthError(error.message);
        return;
    }

    if (data.user && !data.session) {
        showAuthError('Check your email for the confirmation link!');
    } else if (data.session) {
        state.user = data.user;
        await loadFromSupabase();
        showHome();
    }
}

async function signIn(email, password) {
    showAuthError('');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showAuthError(error.message);
        return;
    }

    state.user = data.user;
    await loadFromSupabase();
    showHome();
}

async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        showAuthError(error.message);
    }
}

async function signOut() {
    await supabaseClient.auth.signOut();
    state.user = null;
    state.lists = [];
    showAuth();
}

function showAuthError(message) {
    if (message) {
        elements.authError.textContent = message;
        elements.authError.classList.remove('hidden');
    } else {
        elements.authError.classList.add('hidden');
    }
}

// ===== Supabase Sync Functions =====
async function loadFromSupabase() {
    if (!state.user) return;

    showSyncStatus('Syncing...', 'syncing');

    try {
        // Load lists
        const { data: lists, error: listsError } = await supabase
            .from('lists')
            .select('*')
            .order('position', { ascending: true });

        if (listsError) throw listsError;

        // Load tasks
        const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .order('position', { ascending: true });

        if (tasksError) throw tasksError;

        // Organize tasks into lists
        state.lists = lists.map(list => ({
            id: list.id,
            name: list.name,
            color: list.color,
            position: list.position,
            createdAt: new Date(list.created_at).getTime(),
            tasks: tasks
                .filter(t => t.list_id === list.id)
                .map(t => ({
                    id: t.id,
                    content: t.content,
                    completed: t.completed,
                    position: t.position,
                    createdAt: new Date(t.created_at).getTime(),
                    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null
                }))
        }));

        showSyncStatus('Synced!', 'success');
        renderHome();
    } catch (error) {
        console.error('Sync error:', error);
        showSyncStatus('Sync failed', 'error');
    }
}

async function syncToSupabase() {
    if (!state.user) return;
    showSyncStatus('Saving...', 'syncing');
}

function showSyncStatus(text, type) {
    const syncIcon = elements.syncStatus.querySelector('.sync-icon');
    const syncText = elements.syncStatus.querySelector('.sync-text');

    syncText.textContent = text;
    elements.syncStatus.classList.remove('hidden', 'success', 'error');
    syncIcon.classList.remove('spinning');

    if (type === 'syncing') {
        syncIcon.textContent = '↻';
        syncIcon.classList.add('spinning');
    } else if (type === 'success') {
        elements.syncStatus.classList.add('success');
        syncIcon.textContent = '✓';
        setTimeout(() => elements.syncStatus.classList.add('hidden'), 2000);
    } else if (type === 'error') {
        elements.syncStatus.classList.add('error');
        syncIcon.textContent = '✕';
        setTimeout(() => elements.syncStatus.classList.add('hidden'), 3000);
    }
}

// ===== Utility Functions =====
function generateId() {
    return crypto.randomUUID();
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return 'Today at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'long' }) + ' at ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Render Functions =====
function renderHome() {
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

        setupListDragAndDrop();
    }
}

function renderListDetail() {
    const list = state.lists.find(l => l.id === state.currentListId);
    if (!list) return;

    elements.listTitle.textContent = list.name;
    document.querySelector('.list-header').style.borderBottomColor = list.color;

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

    if (completedTasks.length > 0) {
        elements.completedSection.classList.remove('hidden');
        elements.completedCount.textContent = completedTasks.length;
        elements.completedTasks.innerHTML = completedTasks
            .sort((a, b) => b.completedAt - a.completedAt)
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

// ===== Navigation =====
function showAuth() {
    elements.authView.classList.add('active');
    elements.homeView.classList.remove('active');
    elements.listView.classList.remove('active');
}

function showHome() {
    state.currentListId = null;
    elements.authView.classList.remove('active');
    elements.listView.classList.remove('active');
    elements.homeView.classList.add('active');
    if (state.user) {
        elements.userEmail.textContent = state.user.email;
    }
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
async function createList(name, color) {
    const position = state.lists.length;
    const id = generateId();

    const list = {
        id,
        name: name.trim(),
        color,
        position,
        tasks: [],
        createdAt: Date.now()
    };

    // Optimistic update
    state.lists.push(list);
    renderHome();

    // Sync to Supabase
    if (state.user) {
        const { error } = await supabaseClient.from('lists').insert({
            id,
            user_id: state.user.id,
            name: name.trim(),
            color,
            position
        });

        if (error) {
            console.error('Error creating list:', error);
            showSyncStatus('Failed to save', 'error');
        } else {
            showSyncStatus('Saved!', 'success');
        }
    }

    return list;
}

async function updateList(listId, name, color) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    list.name = name.trim();
    list.color = color;

    if (state.user) {
        const { error } = await supabase
            .from('lists')
            .update({ name: name.trim(), color })
            .eq('id', listId);

        if (error) {
            console.error('Error updating list:', error);
            showSyncStatus('Failed to save', 'error');
        } else {
            showSyncStatus('Saved!', 'success');
        }
    }
}

async function deleteList(listId) {
    state.lists = state.lists.filter(l => l.id !== listId);

    if (state.currentListId === listId) {
        showHome();
    }

    if (state.user) {
        const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', listId);

        if (error) {
            console.error('Error deleting list:', error);
            showSyncStatus('Failed to delete', 'error');
        } else {
            showSyncStatus('Deleted!', 'success');
        }
    }
}

async function reorderLists(fromIndex, toIndex) {
    const [removed] = state.lists.splice(fromIndex, 1);
    state.lists.splice(toIndex, 0, removed);

    // Update positions
    state.lists.forEach((list, index) => {
        list.position = index;
    });

    if (state.user) {
        const updates = state.lists.map((list, index) => ({
            id: list.id,
            user_id: state.user.id,
            name: list.name,
            color: list.color,
            position: index
        }));

        const { error } = await supabase
            .from('lists')
            .upsert(updates);

        if (error) {
            console.error('Error reordering lists:', error);
        }
    }
}

// ===== Task Operations =====
async function addTask(listId, content) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return null;

    const id = generateId();
    const position = list.tasks.filter(t => !t.completed).length;

    const task = {
        id,
        content: content.trim(),
        completed: false,
        position,
        createdAt: Date.now(),
        completedAt: null
    };

    list.tasks.unshift(task);

    if (state.user) {
        const { error } = await supabaseClient.from('tasks').insert({
            id,
            list_id: listId,
            user_id: state.user.id,
            content: content.trim(),
            completed: false,
            position
        });

        if (error) {
            console.error('Error adding task:', error);
            showSyncStatus('Failed to save', 'error');
        } else {
            showSyncStatus('Saved!', 'success');
        }
    }

    return task;
}

async function toggleTask(taskId) {
    for (const list of state.lists) {
        const task = list.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? Date.now() : null;

            if (state.user) {
                const { error } = await supabase
                    .from('tasks')
                    .update({
                        completed: task.completed,
                        completed_at: task.completed ? new Date().toISOString() : null
                    })
                    .eq('id', taskId);

                if (error) {
                    console.error('Error toggling task:', error);
                }
            }

            return task;
        }
    }
    return null;
}

async function reorderTasks(listId, fromIndex, toIndex) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const activeTasks = list.tasks.filter(t => !t.completed);
    const completedTasks = list.tasks.filter(t => t.completed);

    const [removed] = activeTasks.splice(fromIndex, 1);
    activeTasks.splice(toIndex, 0, removed);

    // Update positions
    activeTasks.forEach((task, index) => {
        task.position = index;
    });

    list.tasks = [...activeTasks, ...completedTasks];

    if (state.user) {
        const updates = activeTasks.map((task, index) => ({
            id: task.id,
            list_id: listId,
            user_id: state.user.id,
            content: task.content,
            completed: task.completed,
            position: index,
            completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null
        }));

        const { error } = await supabase
            .from('tasks')
            .upsert(updates);

        if (error) {
            console.error('Error reordering tasks:', error);
        }
    }
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

// ===== Event Listeners =====
function setupEventListeners() {
    // Auth tabs
    elements.authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            modalState.authMode = tab.dataset.tab;
            elements.authSubmit.textContent = modalState.authMode === 'login' ? 'Log In' : 'Sign Up';
            showAuthError('');
        });
    });

    // Auth submit
    elements.authSubmit.addEventListener('click', () => {
        const email = elements.authEmail.value.trim();
        const password = elements.authPassword.value;

        if (!email || !password) {
            showAuthError('Please enter email and password');
            return;
        }

        if (modalState.authMode === 'login') {
            signIn(email, password);
        } else {
            signUp(email, password);
        }
    });

    // Enter key on password field
    elements.authPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.authSubmit.click();
        }
    });

    // Google auth
    elements.authGoogle.addEventListener('click', signInWithGoogle);

    // User menu
    elements.userMenuBtn.addEventListener('click', () => {
        openModal(elements.userModal);
    });

    elements.userModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(elements.userModal);
    });

    elements.syncNowBtn.addEventListener('click', async () => {
        closeModal(elements.userModal);
        await loadFromSupabase();
        renderHome();
    });

    elements.logoutBtn.addEventListener('click', async () => {
        closeModal(elements.userModal);
        await signOut();
    });

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

    elements.addTaskBtn.addEventListener('click', async () => {
        const content = elements.newTaskInput.value.trim();
        if (content && state.currentListId) {
            await addTask(state.currentListId, content);
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

    elements.confirmQuickAdd.addEventListener('click', async () => {
        const content = elements.quickTaskInput.value.trim();
        if (content && modalState.selectedListId) {
            await addTask(modalState.selectedListId, content);
            closeModal(elements.quickAddModal);
            renderHome();
        } else if (content && !modalState.selectedListId) {
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

    elements.confirmListModal.addEventListener('click', async () => {
        const name = elements.listNameInput.value.trim();
        if (!name) {
            elements.listNameInput.focus();
            return;
        }

        if (modalState.editingListId) {
            await updateList(modalState.editingListId, name, modalState.selectedColor);
            closeModal(elements.listModal);
            if (state.currentListId) {
                renderListDetail();
            } else {
                renderHome();
            }
        } else {
            const newList = await createList(name, modalState.selectedColor);
            closeModal(elements.listModal);
            if (elements.quickTaskInput.value.trim()) {
                modalState.selectedListId = newList.id;
                openQuickAddModal();
                elements.quickTaskInput.value = elements.quickTaskInput.value;
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

    elements.confirmDelete.addEventListener('click', async () => {
        if (modalState.pendingDeleteListId) {
            await deleteList(modalState.pendingDeleteListId);
            closeModal(elements.deleteModal);
            renderHome();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.userModal.classList.contains('active')) {
                closeModal(elements.userModal);
            } else if (elements.deleteModal.classList.contains('active')) {
                closeModal(elements.deleteModal);
            } else if (elements.listModal.classList.contains('active')) {
                closeModal(elements.listModal);
            } else if (elements.quickAddModal.classList.contains('active')) {
                closeModal(elements.quickAddModal);
            }
        }
    });

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            state.user = session.user;
            loadFromSupabase().then(() => showHome());
        } else if (event === 'SIGNED_OUT') {
            state.user = null;
            state.lists = [];
            showAuth();
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
async function init() {
    setupEventListeners();
    registerServiceWorker();
    await checkAuth();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
