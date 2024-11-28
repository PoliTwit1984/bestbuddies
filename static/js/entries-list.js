import { showNotification } from './utils.js';

class EntriesList {
    constructor() {
        this.container = document.getElementById('entriesList');
        this.tagFilter = document.getElementById('tagFilter');
        this.startDateFilter = document.getElementById('startDateFilter');
        this.endDateFilter = document.getElementById('endDateFilter');
        this.viewMode = 'list';
        this.initializeTagify();
        this.editorInstance = null;
        this.activePreview = null;
        this.initializeModal();
        this.loadEntries();
    }

    initializeModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('entryModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'entryModal';
        modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 hidden items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6" id="modalContent"></div>
            </div>
        `;
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        document.body.appendChild(modal);
    }

    showModal(content) {
        const modal = document.getElementById('entryModal');
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }

    closeModal() {
        const modal = document.getElementById('entryModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
        
        // Cleanup CKEditor instance if it exists
        if (this.editorInstance) {
            this.editorInstance.destroy()
                .catch(error => console.error('Error destroying CKEditor:', error));
            this.editorInstance = null;
        }
    }

    async initializeTagify() {
        try {
            const response = await fetch('/api/tags');
            const tags = await response.json();
            
            this.tagify = new Tagify(this.tagFilter, {
                whitelist: tags.map(tag => tag.tag),
                dropdown: {
                    enabled: 1,
                    position: "text",
                    closeOnSelect: true,
                    highlightFirst: true,
                    fuzzySearch: true,
                    classname: 'tags-dropdown'
                },
                editTags: false,
                maxTags: 10,
                backspace: "edit",
                placeholder: "Filter by tag",
                delimiters: ",",
                callbacks: {
                    add: () => {
                        this.tagify.DOM.input.value = '';
                    }
                }
            });

            const wrapper = this.tagFilter.closest('div');
            const dropdownBtn = document.createElement('button');
            dropdownBtn.type = 'button';
            dropdownBtn.className = 'tags-dropdown-button';
            dropdownBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            `;
            wrapper.appendChild(dropdownBtn);

            dropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.tagify.dropdown.visible) {
                    this.tagify.dropdown.hide();
                } else {
                    this.tagify.DOM.input.focus();
                    this.tagify.dropdown.show();
                }
            });
        } catch (error) {
            console.error('Error initializing Tagify:', error);
            showNotification('Error loading tags', true);
        }
    }

    async loadEntries() {
        let tagFilter = '';
        if (this.tagify && this.tagify.value.length > 0) {
            tagFilter = this.tagify.value.map(tag => tag.value).join(',');
        }

        const startDate = this.startDateFilter.value;
        const endDate = this.endDateFilter.value;
        const queryParams = new URLSearchParams();

        if (tagFilter) queryParams.append('tag', tagFilter);
        if (startDate) queryParams.append('start_date', startDate);
        if (endDate) queryParams.append('end_date', endDate);

        try {
            const response = await fetch(`/api/entries?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch entries');
            
            const entries = await response.json();
            
            if (this.viewMode === 'list') {
                this.renderListView(entries);
            } else {
                this.renderTimeline(entries);
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error loading entries', true);
            this.container.innerHTML = '<p class="text-red-500">Error loading entries</p>';
        }
    }

    renderListView(entries) {
        if (entries.length === 0) {
            this.container.innerHTML = '<p class="text-gray-400">No entries found</p>';
            return;
        }

        this.container.innerHTML = entries.map(entry => this.renderEntry(entry)).join('');
    }

    renderTimeline(entries) {
        if (entries.length === 0) {
            this.container.innerHTML = '<p class="text-gray-400">No entries to display on timeline</p>';
            return;
        }

        this.container.innerHTML = `
            <div class="timeline-container">
                <div class="timeline"></div>
            </div>
        `;
        const timelineContainer = this.container.querySelector('.timeline-container');
        const timeline = timelineContainer.querySelector('.timeline');

        entries.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

        const startDate = this.startDateFilter.value ? 
            new Date(this.startDateFilter.value) : 
            new Date(entries[0].entry_date);
        const endDate = this.endDateFilter.value ? 
            new Date(this.endDateFilter.value) : 
            new Date(entries[entries.length - 1].entry_date);

        entries.forEach(entry => {
            const dot = document.createElement('div');
            dot.className = 'timeline-dot';
            const position = this.calculateTimelinePosition(entry.entry_date, startDate, endDate);
            dot.style.left = `${position}%`;
            
            const formattedDate = new Date(entry.entry_date).toLocaleDateString();
            dot.setAttribute('data-date', formattedDate);

            const preview = document.createElement('div');
            preview.className = 'timeline-entry-preview';
            preview.innerHTML = this.createPreviewContent(entry);
            timelineContainer.appendChild(preview);

            dot.addEventListener('mouseenter', (e) => this.showPreview(e, preview, dot));
            dot.addEventListener('mouseleave', () => this.hidePreview(preview));
            dot.addEventListener('click', () => this.showTimelineEntry(entry));

            timeline.appendChild(dot);
        });

        if (endDate - startDate > 30 * 24 * 60 * 60 * 1000) {
            this.addTimelineMarkers(timeline, startDate, endDate);
        }
    }

    showTimelineEntry(entry) {
        const entryContent = `
            <div class="relative">
                <button onclick="window.entriesList.closeModal()" 
                    class="absolute top-0 right-0 text-gray-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                
                <div class="pr-8">
                    <h3 class="text-xl font-semibold mb-2">${entry.title}</h3>
                    <p class="text-gray-400 text-sm">Entry Date: ${new Date(entry.entry_date).toLocaleString()}</p>
                    <p class="text-gray-400 text-sm mb-4">Created: ${new Date(entry.created_at).toLocaleString()}</p>
                    
                    <div class="prose prose-invert max-w-none">
                        ${entry.content}
                    </div>
                    
                    <div class="flex flex-wrap gap-2 mt-4">
                        ${entry.tags.map(tag => `
                            <span class="inline-block bg-gray-700 text-sm px-2 py-1 rounded">${tag}</span>
                        `).join('')}
                    </div>
                    
                    ${this.renderMedia(entry.media)}
                    
                    <div class="flex justify-end space-x-4 mt-6">
                        <button onclick="window.entriesList.editEntry('${entry.id}')"
                            class="text-blue-500 hover:text-blue-400 font-semibold">
                            Edit
                        </button>
                        <button onclick="window.entriesList.deleteEntry('${entry.id}')"
                            class="text-red-500 hover:text-red-400 font-semibold">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(entryContent);
    }

    calculateTimelinePosition(entryDate, startDate, endDate) {
        const date = new Date(entryDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const entryDuration = date.getTime() - startDate.getTime();
        return Math.max(0, Math.min(100, (entryDuration / totalDuration) * 100));
    }

    createPreviewContent(entry) {
        const previewContent = entry.content.length > 100 ? 
            `${entry.content.substring(0, 100)}...` : 
            entry.content;

        return `
            <h4 class="font-semibold mb-2">${entry.title}</h4>
            <p class="text-sm text-gray-400">${new Date(entry.entry_date).toLocaleString()}</p>
            <p class="text-sm mt-2">${previewContent}</p>
            ${entry.tags.length > 0 ? `
                <div class="flex flex-wrap gap-1 mt-2">
                    ${entry.tags.map(tag => `
                        <span class="text-xs px-2 py-1 bg-gray-700 rounded-full">${tag}</span>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    showPreview(event, preview, dot) {
        if (this.activePreview) {
            this.activePreview.classList.remove('visible');
        }

        const dotRect = dot.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        let left = dotRect.left - containerRect.left - (preview.offsetWidth / 2);
        const top = -120;

        left = Math.max(10, Math.min(left, containerRect.width - preview.offsetWidth - 10));

        preview.style.left = `${left}px`;
        preview.style.top = `${top}px`;

        preview.classList.add('visible');
        this.activePreview = preview;
        dot.classList.add('active');
    }

    hidePreview(preview) {
        setTimeout(() => {
            preview.classList.remove('visible');
            const activeDot = this.container.querySelector('.timeline-dot.active');
            if (activeDot) {
                activeDot.classList.remove('active');
            }
        }, 100);
    }

    addTimelineMarkers(timeline, startDate, endDate) {
        const months = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            months.push(new Date(currentDate));
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        months.forEach(date => {
            const position = this.calculateTimelinePosition(date, startDate, endDate);
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.style.left = `${position}%`;
            marker.textContent = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            timeline.appendChild(marker);
        });
    }

    toggleView() {
        this.viewMode = this.viewMode === 'list' ? 'timeline' : 'list';
        this.loadEntries();
    }

    clearFilters() {
        this.tagify.removeAllTags();
        this.startDateFilter.value = '';
        this.endDateFilter.value = '';
        this.loadEntries();
    }

    renderEntry(entry) {
        return `
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-4">
                <div class="flex justify-between items-start">
                    <div class="space-y-4 w-full">
                        <div>
                            <h3 class="text-lg font-semibold">${entry.title}</h3>
                            <p class="text-gray-400 text-sm">Entry Date: ${new Date(entry.entry_date).toLocaleString()}</p>
                            <p class="text-gray-400 text-sm">Created: ${new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                        
                        <p class="text-gray-300">${entry.content}</p>
                        
                        <div class="flex flex-wrap gap-2">
                            ${entry.tags.map(tag => `
                                <span class="inline-block bg-gray-700 text-sm px-2 py-1 rounded">${tag}</span>
                            `).join('')}
                        </div>
                        
                        ${this.renderMedia(entry.media)}
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        <button onclick="window.entriesList.editEntry('${entry.id}')"
                            class="text-blue-500 hover:text-blue-400">
                            Edit
                        </button>
                        <button onclick="window.entriesList.deleteEntry('${entry.id}')"
                            class="text-red-500 hover:text-red-400">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderMedia(media) {
        if (!media || media.length === 0) return '';

        return `
            <div class="grid grid-cols-2 gap-4 mt-4 entry-media">
                ${media.map(item => {
                    if (item.type === 'image') {
                        return `
                            <div class="relative">
                                <img src="${item.url}" alt="${item.filename}" 
                                    class="w-full h-32 object-cover rounded-md">
                                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                    ${item.filename} (${(item.size / 1024 / 1024).toFixed(2)}MB)
                                </div>
                            </div>
                        `;
                    } else if (item.type === 'video') {
                        return `
                            <div class="bg-gray-700 p-2 rounded-md">
                                <video controls class="w-full rounded-md">
                                    <source src="${item.url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <div class="text-sm mt-1">
                                    ${item.filename} (${(item.size / 1024 / 1024).toFixed(2)}MB)
                                </div>
                            </div>
                        `;
                    } else if (item.type === 'audio') {
                        return `
                            <div class="bg-gray-700 p-2 rounded-md">
                                <audio controls class="w-full">
                                    <source src="${item.url}" type="audio/mpeg">
                                    Your browser does not support the audio tag.
                                </audio>
                                <div class="text-sm mt-1">
                                    ${item.filename} (${(item.size / 1024 / 1024).toFixed(2)}MB)
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;
    }

    async editEntry(entryId) {
        try {
            const response = await fetch(`/api/entries/${entryId}`);
            const entry = await response.json();

            const editFormHtml = `
                <div class="relative">
                    <button onclick="window.entriesList.closeModal()" 
                        class="absolute top-0 right-0 text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    
                    <div class="pr-8">
                        <h3 class="text-xl font-semibold mb-4">Edit Entry</h3>
                        <form id="editEntryForm">
                            <div class="mb-4">
                                <label class="block text-gray-400 text-sm mb-2" for="editTitle">Title</label>
                                <input type="text" id="editTitle" name="title" value="${entry.title}" 
                                    class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full">
                            </div>
                            <div class="mb-4">
                                <label class="block text-gray-400 text-sm mb-2" for="editContent">Content</label>
                                <textarea id="editContent" name="content" 
                                    class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full min-h-[200px]">${entry.content}</textarea>
                            </div>
                            <div class="mb-4">
                                <label class="block text-gray-400 text-sm mb-2" for="editEntryDate">Entry Date</label>
                                <input type="datetime-local" id="editEntryDate" name="entry_date" 
                                    value="${new Date(entry.entry_date).toISOString().slice(0, 16)}" 
                                    class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full">
                            </div>
                            <div class="flex justify-end">
                                <button type="button" onclick="window.entriesList.saveEntry('${entry.id}')" 
                                    class="bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-md transition duration-200">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            this.showModal(editFormHtml);

            // Initialize CKEditor
            ClassicEditor
                .create(document.querySelector('#editContent'), {
                    toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'blockQuote', 'insertTable', 'imageUpload', 'mediaEmbed', 'undo', 'redo'],
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
                        ]
                    }
                })
                .then(editor => {
                    this.editorInstance = editor;
                })
                .catch(error => {
                    console.error('Error initializing CKEditor:', error);
                });

        } catch (error) {
            console.error('Error loading entry for editing:', error);
            showNotification('Error loading entry for editing', true);
        }
    }

    async saveEntry(entryId) {
        const form = document.getElementById('editEntryForm');
        const formData = new FormData(form);
        const content = this.editorInstance.getData();

        try {
            const response = await fetch(`/api/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: formData.get('title'),
                    content: content,
                    entry_date: formData.get('entry_date')
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.closeModal();
                this.loadEntries();
                showNotification('Entry updated successfully');
            } else {
                showNotification('Error updating entry', true);
            }
        } catch (error) {
            console.error('Error updating entry:', error);
            showNotification('Error updating entry', true);
        }
    }

    async deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/entries/${entryId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.closeModal();
                    this.loadEntries();
                    showNotification('Entry deleted successfully');
                } else {
                    showNotification('Error deleting entry', true);
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error deleting entry', true);
            }
        }
    }
}

window.entriesList = new EntriesList();
