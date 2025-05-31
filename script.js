document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskLists = document.querySelectorAll('.task-list');
    
    let tasks = JSON.parse(localStorage.getItem('tasks')) || {
        todo: [],
        inProgress: [],
        done: []
    };
    
    let draggedTask = null;
    let draggedTaskList = null;
    let touchStartY = 0;
    let touchStartX = 0;
    
    function saveTasksToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    function createTaskElement(taskText, priority) {
        const task = document.createElement('div');
        task.className = `task priority-${priority}`;
        task.draggable = true;
        
        task.innerHTML = `
            <div class="task-content" contenteditable="true">${taskText}</div>
            <div class="priority-indicator">${priority}</div>
            <button class="delete-btn">×</button>
        `;

        const taskContent = task.querySelector('.task-content');
        const priorityIndicator = task.querySelector('.priority-indicator');
        
        // Make task content editable on click
        taskContent.addEventListener('blur', () => {
            const newText = taskContent.textContent.trim();
            if (newText) {
                const status = task.closest('.column').dataset.status;
                const taskIndex = Array.from(task.parentElement.children).indexOf(task);
                tasks[status][taskIndex].text = newText;
                saveTasksToLocalStorage();
            } else {
                taskContent.textContent = taskText; // Restore original text if empty
            }
        });

        taskContent.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                taskContent.blur();
            }
        });

        // Touch events for drag and drop
        task.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling while dragging
            draggedTask = task;
            draggedTaskList = task.parentElement;
            task.classList.add('dragging');
            
            const touch = e.touches[0];
            touchStartY = touch.clientY;
            touchStartX = touch.clientX;
            
            // Create visual feedback
            task.style.opacity = '0.5';
            task.style.transform = 'scale(1.02)';
        }, { passive: false });

        task.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            
            // Update task position
            const deltaY = touch.clientY - touchStartY;
            const deltaX = touch.clientX - touchStartX;
            task.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`;
            
            // Find the task list under the touch point
            const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
            const taskList = elementUnderTouch?.closest('.task-list');
            
            if (taskList) {
                taskLists.forEach(list => list.classList.remove('drag-over'));
                taskList.classList.add('drag-over');
                
                const afterElement = getDragAfterElement(taskList, touch.clientY);
                if (afterElement) {
                    taskList.insertBefore(draggedTask, afterElement);
                } else {
                    taskList.appendChild(draggedTask);
                }
            }
        }, { passive: false });

        task.addEventListener('touchend', () => {
            if (draggedTask) {
                const newTaskList = draggedTask.parentElement;
                const newStatus = newTaskList.parentElement.dataset.status;
                const oldStatus = draggedTaskList.parentElement.dataset.status;
                const oldIndex = Array.from(draggedTaskList.children).indexOf(draggedTask);
                const newIndex = Array.from(newTaskList.children).indexOf(draggedTask);
                
                // Update tasks array
                if (oldStatus !== newStatus || oldIndex !== newIndex) {
                    const task = tasks[oldStatus].splice(oldIndex, 1)[0];
                    tasks[newStatus].splice(newIndex, 0, task);
                    saveTasksToLocalStorage();
                }
                
                // Reset styles
                draggedTask.style.transform = '';
                draggedTask.style.opacity = '';
                draggedTask.classList.remove('dragging');
                taskLists.forEach(list => list.classList.remove('drag-over'));
                
                draggedTask = null;
                draggedTaskList = null;
            }
        });

        // Priority selection popup
        priorityIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentPriority = task.className.match(/priority-(\w+)/)[1];
            
            const popup = document.createElement('div');
            popup.className = 'priority-popup';
            popup.innerHTML = `
                <div class="priority-option ${currentPriority === 'low' ? 'selected' : ''}" data-priority="low">Low</div>
                <div class="priority-option ${currentPriority === 'medium' ? 'selected' : ''}" data-priority="medium">Medium</div>
                <div class="priority-option ${currentPriority === 'high' ? 'selected' : ''}" data-priority="high">High</div>
            `;
            
            // Position popup
            const rect = priorityIndicator.getBoundingClientRect();
            popup.style.top = rect.bottom + 'px';
            popup.style.left = rect.left + 'px';
            
            document.body.appendChild(popup);
            
            // Handle priority selection
            popup.addEventListener('click', (e) => {
                if (e.target.classList.contains('priority-option')) {
                    const newPriority = e.target.dataset.priority;
                    const status = task.closest('.column').dataset.status;
                    const taskIndex = Array.from(task.parentElement.children).indexOf(task);
                    
                    task.className = `task priority-${newPriority}`;
                    priorityIndicator.textContent = newPriority;
                    tasks[status][taskIndex].priority = newPriority;
                    saveTasksToLocalStorage();
                    
                    popup.remove();
                }
            });
            
            // Close popup when clicking outside
            function closePopup(e) {
                if (!popup.contains(e.target) && !priorityIndicator.contains(e.target)) {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            }
            
            setTimeout(() => {
                document.addEventListener('click', closePopup);
            }, 0);
        });
        
        // Delete button functionality
        task.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const taskList = task.parentElement;
            const status = taskList.parentElement.dataset.status;
            const taskIndex = Array.from(taskList.children).indexOf(task);
            
            tasks[status].splice(taskIndex, 1);
            saveTasksToLocalStorage();
            task.remove();
        });
        
        // Desktop drag events
        task.addEventListener('dragstart', (e) => {
            draggedTask = task;
            draggedTaskList = task.parentElement;
            task.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            
            const dragImage = task.cloneNode(true);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.opacity = '0.5';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 0);
        });
        
        task.addEventListener('dragend', () => {
            task.classList.remove('dragging');
            draggedTask = null;
            draggedTaskList = null;
            
            document.querySelectorAll('.task-list').forEach(list => {
                list.classList.remove('drag-over');
            });
        });
        
        return task;
    }
    
    function renderTasks() {
        Object.entries(tasks).forEach(([status, taskList]) => {
            const container = document.querySelector(`[data-status="${status}"] .task-list`);
            container.innerHTML = '';
            taskList.forEach(task => {
                container.appendChild(createTaskElement(task.text, task.priority));
            });
        });
    }
    
    // Initialize drag and drop for task lists
    taskLists.forEach(taskList => {
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            taskList.classList.add('drag-over');
            
            if (draggedTask) {
                const afterElement = getDragAfterElement(taskList, e.clientY);
                if (afterElement) {
                    taskList.insertBefore(draggedTask, afterElement);
                } else {
                    taskList.appendChild(draggedTask);
                }
            }
        });
        
        taskList.addEventListener('dragleave', () => {
            taskList.classList.remove('drag-over');
        });
        
        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            taskList.classList.remove('drag-over');
            
            if (draggedTask && draggedTaskList) {
                const newStatus = taskList.parentElement.dataset.status;
                const oldStatus = draggedTaskList.parentElement.dataset.status;
                const oldIndex = Array.from(draggedTaskList.children).indexOf(draggedTask);
                const newIndex = Array.from(taskList.children).indexOf(draggedTask);
                
                const task = tasks[oldStatus].splice(oldIndex, 1)[0];
                tasks[newStatus].splice(newIndex, 0, task);
                saveTasksToLocalStorage();
            }
        });
    });
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Add new task
    addTaskBtn.addEventListener('click', () => {
        const text = taskInput.value.trim();
        const priority = prioritySelect.value;
        
        if (text) {
            tasks.todo.push({ text, priority });
            saveTasksToLocalStorage();
            renderTasks();
            taskInput.value = '';
        }
    });
    
    // Add task on Enter key
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskBtn.click();
        }
    });
    
    // Initial render
    renderTasks();
});