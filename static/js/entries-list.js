import { showNotification } from './utils.js';

class EntriesList {
    constructor() {
        this.container = document.getElementById('entriesList');
        this.tagFilter = document.getElementById('tagFilter');
        this.initializeTagify();
    }

    async initializeTagify() {
        try {
            // Fetch existing tags from the server
            const response = await fetch('/api/tags');
            const tags = await response.json();
            console.log('Fetched existing tags:', tags);
            
            // Initialize Tagify with whitelist of existing tags
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
                        // Clear input after adding tag
                        this.tagify.DOM.input.value = '';
                    }
                }
            });

            console.log('Tagify initialized with whitelist:', tags.map(tag => tag.tag));

            // Add dropdown toggle button
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

            // Handle dropdown button click
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

            // Clear input after selecting from dropdown
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
                    
                    <button onclick="window.entriesList.deleteEntry('${entry.id}')"
                        class="text-red-500 hover:text-red-400 ml-4">
                        Delete
                    </button>
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

// Initialize and export for global access
window.entriesList = new EntriesList();
