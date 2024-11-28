import { showNotification } from './utils.js';

class EntriesList {
    constructor() {
        this.container = document.getElementById('entriesList');
        this.tagFilter = document.getElementById('tagFilter');
        this.initializeTagify();
        this.editorInstance = null; // Store CKEditor instance
    }

    async initializeTagify() {
        try {
            const response = await fetch('/api/tags');
            const tags = await response.json();
            console.log('Fetched existing tags:', tags);
            
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

            console.log('Tagify initialized with whitelist:', tags.map(tag => tag.tag));

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

            this.tagify.on('dropdown:select', (e) => {
                console.log('Tag selected from dropdown:', e.detail);
                setTimeout(() => {
                    this.tagify.DOM.input.value = '';
                    this.tagify.state.inputText = '';
                }, 10);
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
        
        try {
            const response = await fetch(`/api/entries?${tagFilter ? 'tag=' + tagFilter : ''}`);
            const entries = await response.json();
            
            this.container.innerHTML = entries.map(entry => this.renderEntry(entry)).join('') || 
                '<p class="text-gray-400">No entries found</p>';
        } catch (error) {
            console.error('Error:', error);
            this.container.innerHTML = '<p class="text-red-500">Error loading entries</p>';
        }
    }

    renderEntry(entry) {
        return `
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
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

            // Display edit form with current entry details
            const editFormHtml = `
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold">Edit Entry</h3>
                    <form id="editEntryForm">
                        <div class="mb-4">
                            <label class="block text-gray-400 text-sm mb-2" for="editTitle">Title</label>
                            <input type="text" id="editTitle" name="title" value="${entry.title}" class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full">
                        </div>
                        <div class="mb-4">
                            <label class="block text-gray-400 text-sm mb-2" for="editContent">Content</label>
                            <textarea id="editContent" name="content" class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full">${entry.content}</textarea>
                        </div>
                        <div class="mb-4">
                            <label class="block text-gray-400 text-sm mb-2" for="editEntryDate">Entry Date</label>
                            <input type="datetime-local" id="editEntryDate" name="entry_date" value="${new Date(entry.entry_date).toISOString().slice(0, 16)}" class="bg-gray-700 border border-gray-600 rounded-md p-2 w-full">
                        </div>
                        <button type="button" onclick="window.entriesList.saveEntry('${entry.id}')" class="bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-md transition duration-200">
                            Save
                        </button>
                    </form>
                </div>
            `;

            this.container.innerHTML = editFormHtml;

            // Initialize CKEditor on the content textarea
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
                    this.editorInstance = editor; // Store the editor instance
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

        // Get the content from CKEditor
        const content = this.editorInstance.getData();

        try {
            const response = await fetch(`/api/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: formData.get('title'),
                    content: content, // Use CKEditor content
                    entry_date: formData.get('entry_date')
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
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
