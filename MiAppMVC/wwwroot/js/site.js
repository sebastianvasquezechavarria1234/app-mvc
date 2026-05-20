// --- KanbanFlow Interactive Logic ---

// Variables globales para la caché de tareas local y manejo de transiciones
let allTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    // Carga inicial de tareas al abrir la página
    fetchTasks();
});

// 1. Obtener y Renderizar Tareas
async function fetchTasks() {
    try {
        const response = await fetch('/Home/GetTasks');
        if (!response.ok) throw new Error('Error al obtener tareas del servidor');
        
        allTasks = await response.json();
        renderKanban();
        updateStatistics();
    } catch (error) {
        console.error('Error:', error);
        showToast('No se pudo conectar con el servidor', 'danger');
    }
}

function renderKanban() {
    const statuses = ['Todo', 'InProgress', 'Done'];
    
    // Limpiar listas y colocar loaders
    statuses.forEach(status => {
        const listEl = document.getElementById(`list-${status}`);
        if (!listEl) return;
        listEl.innerHTML = '';
        
        const tasksInStatus = allTasks.filter(t => t.status === status);
        
        if (tasksInStatus.length === 0) {
            listEl.innerHTML = `
                <div class="empty-placeholder fade-in">
                    <i class="bi bi-inbox-fill"></i>
                    <p>No hay tareas aquí</p>
                </div>
            `;
            return;
        }
        
        tasksInStatus.forEach(task => {
            const card = createTaskCard(task);
            listEl.appendChild(card);
        });
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card fade-in';
    card.id = `task-${task.id}`;
    card.draggable = true;
    
    // Eventos de arrastre
    card.addEventListener('dragstart', (e) => dragStart(e, task.id));
    card.addEventListener('dragend', dragEnd);
    
    // Formateo de fecha de creación
    const dateFormatted = new Date(task.createdAt).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
    });

    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    const priorityLabel = task.priority === 'High' ? 'Alta' : task.priority === 'Medium' ? 'Media' : 'Baja';

    card.innerHTML = `
        <div class="task-card-header">
            <span class="priority-tag ${priorityClass}">${priorityLabel}</span>
            <button class="btn-delete-task" onclick="deleteTask('${task.id}')" title="Eliminar tarea">
                <i class="bi bi-trash3-fill"></i>
            </button>
        </div>
        <h5 class="task-card-title">${escapeHtml(task.title)}</h5>
        <p class="task-card-body">${escapeHtml(task.description)}</p>
        <div class="task-card-footer">
            <div class="task-date">
                <i class="bi bi-calendar3"></i>
                <span>${dateFormatted}</span>
            </div>
            <div>
                <i class="bi bi-grip-vertical text-muted"></i>
            </div>
        </div>
    `;
    
    return card;
}

// 2. Drag & Drop API Handlers
function dragStart(e, taskId) {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Pequeño retardo para dar efecto visual de arrastre
    setTimeout(() => {
        const card = document.getElementById(`task-${taskId}`);
        if (card) card.classList.add('dragging');
    }, 0);
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

function allowDrop(e) {
    e.preventDefault();
}

function dragEnter(e, status) {
    e.preventDefault();
    const column = document.getElementById(`col-${status}`);
    if (column) column.classList.add('drag-over');
}

function dragLeave(e, status) {
    const column = document.getElementById(`col-${status}`);
    if (column) column.classList.remove('drag-over');
}

async function drop(e, targetStatus) {
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    const column = document.getElementById(`col-${targetStatus}`);
    if (column) column.classList.remove('drag-over');
    
    if (!taskId) return;

    // Buscar tarea y verificar si cambió de estado
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const oldStatus = allTasks[taskIndex].status;
    if (oldStatus === targetStatus) return; // Mismo lugar, no hacer nada

    // 1. Optimistic UI Update: Cambiar estado en caché local y re-renderizar de inmediato
    allTasks[taskIndex].status = targetStatus;
    renderKanban();
    updateStatistics();

    try {
        // 2. Persistir en el servidor C#
        const response = await fetch('/Home/UpdateTaskStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: taskId,
                status: targetStatus
            })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar estado en base de datos');
        }
    } catch (error) {
        console.error('Error al guardar movimiento:', error);
        // Revertir en caso de fallo
        allTasks[taskIndex].status = oldStatus;
        renderKanban();
        updateStatistics();
        showToast('Error al mover tarea en el servidor', 'danger');
    }
}

// 3. Crear Nueva Tarea
async function submitNewTask(e) {
    e.preventDefault();
    
    const titleEl = document.getElementById('taskTitle');
    const descEl = document.getElementById('taskDescription');
    const priorityEl = document.getElementById('taskPriority');
    const statusEl = document.getElementById('taskStatus');
    
    const newTask = {
        title: titleEl.value.trim(),
        description: descEl.value.trim(),
        priority: priorityEl.value,
        status: statusEl.value
    };

    try {
        const response = await fetch('/Home/CreateTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        });

        if (!response.ok) throw new Error('Error al crear tarea');

        const createdTask = await response.json();
        
        // Agregar localmente y actualizar UI
        allTasks.unshift(createdTask);
        renderKanban();
        updateStatistics();

        // Limpiar formulario y cerrar modal
        document.getElementById('newTaskForm').reset();
        const modalEl = document.getElementById('newTaskModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        showToast('¡Tarea creada con éxito!', 'success');
    } catch (error) {
        console.error(error);
        showToast('No se pudo guardar la tarea', 'danger');
    }
}

// 4. Eliminar Tarea
async function deleteTask(taskId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;

    // Efecto de desvanecimiento en UI antes del borrado final
    const card = document.getElementById(`task-${taskId}`);
    if (card) {
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        card.style.transition = 'all 0.3s ease';
    }

    try {
        const response = await fetch('/Home/DeleteTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: taskId })
        });

        if (!response.ok) throw new Error('Error del servidor al eliminar');

        // Quitar de la lista local
        allTasks = allTasks.filter(t => t.id !== taskId);
        
        // Pequeña pausa para permitir animación
        setTimeout(() => {
            renderKanban();
            updateStatistics();
        }, 250);

    } catch (error) {
        console.error(error);
        fetchTasks(); // Re-sincronizar completo en caso de error
        showToast('No se pudo eliminar la tarea en el servidor', 'danger');
    }
}

// 5. Utilidades y Helpers
function updateStatistics() {
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'Todo').length;
    const inProgress = allTasks.filter(t => t.status === 'InProgress').length;
    const done = allTasks.filter(t => t.status === 'Done').length;

    // Asignar a elementos con transiciones y conteos
    animateNumber('stat-total', total);
    animateNumber('stat-todo', todo);
    animateNumber('stat-inprogress', inProgress);
    animateNumber('stat-done', done);

    // Actualizar insignias de columnas
    document.getElementById('count-Todo').innerText = todo;
    document.getElementById('count-InProgress').innerText = inProgress;
    document.getElementById('count-Done').innerText = done;
}

function animateNumber(elementId, endValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let startValue = parseInt(el.innerText) || 0;
    if (startValue === endValue) return;

    el.innerText = endValue;
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 300);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Crear un banner de alerta dinámico y premium en la esquina superior derecha (Toasts)
function showToast(message, type = 'success') {
    // Remover toasts antiguos
    const existing = document.querySelector('.premium-toast-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'premium-toast-container';
    container.style.position = 'fixed';
    container.style.top = '24px';
    container.style.right = '24px';
    container.style.zIndex = '9999';
    container.style.pointerEvents = 'none';

    const toast = document.createElement('div');
    toast.className = `toast-body alert alert-${type} fade-in shadow-lg`;
    toast.style.background = 'var(--bg-glass)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.border = `1px solid ${type === 'success' ? 'var(--accent-cyan)' : 'var(--priority-high-text)'}`;
    toast.style.color = 'var(--text-primary)';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '12px';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '600';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.75rem';
    toast.style.pointerEvents = 'auto';

    const icon = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger';

    toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    document.body.appendChild(container);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => container.remove(), 400);
    }, 3000);
}
