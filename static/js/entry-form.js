import { showNotification, getCurrentDateTime } from './utils.js';

class EntryForm {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Initializing EntryForm...');
        
        this.form = document.getElementById('entryForm');
        if (!this.form) {
            console.error('Entry form not found!');
            return;
        }
        
        this.submitButton = document.getElementById('submitButton');
        this.filePreview = document.getElementById('filePreview');
        this.tagInput = document.getElementById('tags-input');
        this.editorElement = document.getElementById('editor');
        
        if (!this.editorElement) {
            console.error('Editor element not found!');
            return;
        }
        
        const dateInput = document.querySelector('input[name="entry_date"]');
        if (dateInput) {
            dateInput.value = getCurrentDateTime();
        }
        
        this.initializeCKEditor().then(() => {
            console.log('CKEditor initialized successfully');
            this.initializeTagify();
            this.initializeFormHandler();
        }).catch(error => {
            console.error('Failed to initialize CKEditor:', error);
            showNotification('Error initializing rich text editor', true);
        });
    }

    async initializeCKEditor() {
        try {
            if (typeof ClassicEditor === 'undefined') {
                throw new Error('CKEditor is not loaded');
            }

            console.log('Starting CKEditor initialization...');
            console.log('Editor element:', this.editorElement);

            this.editor = await ClassicEditor.create(this.editorElement, {
                toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'blockQuote', 'insertTable', 'imageUpload', 'mediaEmbed', 'undo', 'redo'],
                placeholder: 'Write your journal entry here...',
                ckfinder: {
                    uploadUrl: '/api/upload-image'
                },
                heading: {
                    options: [
                        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                        { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
                    ]
                }
            });

            this.editor.model.document.on('change:data', () => {
                console.log('Editor content changed');
            });

            return this.editor;
        } catch (error) {
            console.error('Error in CKEditor initialization:', error);
            throw error;
        }
    }

    initializeFormHandler() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            console.log('Form submit handler initialized');
        }
    }

    async initializeTagify() {
        try {
            const response = await fetch('/api/tags');
            const tags = await response.json();
            console.log('Fetched existing tags:', tags);
            
            this.tagify = new Tagify(this.tagInput, {
                whitelist: tags.map(tag => tag.tag),
                dropdown: {
                    enabled: 1,
                    position: "text",
                    closeOnSelect: true,
                    highlightFirst: true,
                    fuzzySearch: true,
                    classname: 'tags-dropdown'
                },
                editTags: true,
                maxTags: 10,
                backspace: "edit",
                placeholder: "Add tags...",
                delimiters: ",",
                callbacks: {
                    add: (e) => {
                        console.log('Tag added:', e.detail);
                        this.tagify.DOM.input.value = '';
                    }
                }
            });

            console.log('Tagify initialized with whitelist:', tags.map(tag => tag.tag));

            const wrapper = this.tagInput.closest('div');
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

            this.tagify.on('keydown', e => {
                if (e.detail.event.key === 'Tab' && this.tagify.state.inputText) {
                    e.preventDefault();
                    const text = this.tagify.state.inputText.trim();
                    if (text) {
                        console.log('Adding tag via Tab key:', text);
                        this.tagify.addTags([text]);
                        this.tagify.DOM.input.value = '';
                        this.tagify.state.inputText = '';
                    }
                }
            });

            this.tagify.on('dropdown:select', (e) => {
                console.log('Tag selected from dropdown:', e.detail);
                setTimeout(() => {
                    this.tagify.DOM.input.value = '';
                    this.tagify.state.inputText = '';
                }, 10);
            });

            this.tagify.on('blur', () => {
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

    validateFiles(input) {
        const maxSize = 10 * 1024 * 1024;
        const allowedTypes = {
            'image': ['image/jpeg', 'image/png', 'image/gif'],
            'video': ['video/mp4', 'video/quicktime'],
            'audio': ['audio/mpeg', 'audio/wav']
        };

        this.filePreview.innerHTML = '';
        let valid = true;

        Array.from(input.files).forEach(file => {
            const isAllowedType = Object.values(allowedTypes).flat().includes(file.type);
            if (!isAllowedType) {
                showNotification(`File type not allowed: ${file.name}`, true);
                valid = false;
                return;
            }

            if (file.size > maxSize) {
                showNotification(`File too large (max 10MB): ${file.name}`, true);
                valid = false;
                return;
            }

            this.createFilePreview(file);
        });

        if (!valid) {
            input.value = '';
            this.filePreview.innerHTML = '';
        }
    }

    createFilePreview(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'relative';
                preview.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-32 object-cover rounded-md">
                    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                        ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)
                    </div>
                `;
                this.filePreview.appendChild(preview);
            };
            reader.readAsDataURL(file);
        } else {
            const preview = document.createElement('div');
            preview.className = 'bg-gray-700 p-2 rounded-md text-sm';
            preview.innerHTML = `
                <div class="flex items-center">
                    <span class="mr-2">${file.type.startsWith('video/') ? '🎥' : '🎵'}</span>
                    <span>${file.name}</span>
                </div>
                <div class="text-gray-400 text-xs mt-1">
                    ${(file.size / 1024 / 1024).toFixed(2)}MB
                </div>
            `;
            this.filePreview.appendChild(preview);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        console.log('Form submission started...');
        
        if (!this.editor) {
            console.error('Editor not initialized!');
            showNotification('Error: Editor not initialized', true);
            return;
        }
        
        const content = this.editor.getData();
        if (!content.trim()) {
            showNotification('Please enter some content for your journal entry', true);
            return;
        }
        
        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Saving...';
        
        try {
            const formData = new FormData(this.form);
            
            console.log('CKEditor content:', content);
            formData.set('content', content);
            
            if (this.tagify) {
                const tags = this.tagify.value.map(tag => tag.value);
                console.log('Current tagify value:', this.tagify.value);
                console.log('Submitting tags:', tags);
                formData.set('tags', tags.join(','));
            } else {
                console.warn('Tagify not initialized');
            }
            
            console.log('Form data:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            
            console.log('Sending request to server...');
            const response = await fetch('/api/entries', {
                method: 'POST',
                body: formData
            });
            
            console.log('Server response:', response);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Server response data:', data);
                
                const tagsResponse = await fetch('/api/tags');
                const tags = await tagsResponse.json();
                console.log('Updated tags from server:', tags);
                if (this.tagify) {
                    this.tagify.settings.whitelist = tags.map(tag => tag.tag);
                }
                
                this.form.reset();
                this.filePreview.innerHTML = '';
                document.querySelector('input[name="entry_date"]').value = getCurrentDateTime();
                if (this.tagify) {
                    this.tagify.removeAllTags();
                }
                if (this.editor) {
                    this.editor.setData('');
                }
                window.entriesList.loadEntries();
                showNotification('Entry saved successfully!');
            } else {
                const data = await response.json();
                console.error('Server error:', data);
                showNotification(data.error || 'Error saving entry', true);
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            showNotification('Error saving entry', true);
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Save Entry';
        }
    }
}

window.entryForm = new EntryForm();
