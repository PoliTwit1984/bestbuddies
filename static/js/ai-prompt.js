import { showNotification } from './utils.js';

class AIPrompt {
    constructor() {
        this.generateButton = document.getElementById('generateQuestion');
        this.moveToTitleButton = document.getElementById('moveToTitle');
        this.suggestionInput = document.getElementById('suggestionInput');
        this.display = document.getElementById('questionDisplay');
        this.titleField = document.querySelector('input[name="title"]'); // Select by name attribute
        this.init();
    }

    init() {
        this.generateButton.addEventListener('click', () => this.generateQuestion());
        this.moveToTitleButton.addEventListener('click', () => this.moveToTitle());
    }

    async generateQuestion() {
        this.generateButton.disabled = true;
        this.generateButton.textContent = 'Generating...';
        this.display.innerHTML = '<p class="text-gray-300">Generating question...</p>';
        
        const suggestion = this.suggestionInput.value.trim();
        const requestBody = suggestion ? { suggestion } : {};

        try {
            const response = await fetch('/api/generate-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();
            
            if (data.question) {
                this.display.innerHTML = `<p class="text-gray-100">${data.question}</p>`;
            } else {
                this.display.innerHTML = '<p class="text-red-500">Error generating question</p>';
            }
        } catch (error) {
            console.error('Error:', error);
            this.display.innerHTML = '<p class="text-red-500">Error generating question</p>';
        } finally {
            this.generateButton.disabled = false;
            this.generateButton.textContent = 'Generate New Question';
        }
    }

    moveToTitle() {
        const questionText = this.display.textContent;
        if (this.titleField) {
            this.titleField.value = questionText;
        } else {
            console.error('Title field not found');
        }
    }
}

// Initialize and export for global access
window.aiPrompt = new AIPrompt();
