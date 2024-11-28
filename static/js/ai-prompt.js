import { showNotification } from './utils.js';

class AIPrompt {
    constructor() {
        this.button = document.getElementById('generateQuestion');
        this.display = document.getElementById('questionDisplay');
        this.init();
    }

    init() {
        this.button.addEventListener('click', () => this.generateQuestion());
    }

    async generateQuestion() {
        this.button.disabled = true;
        this.button.textContent = 'Generating...';
        this.display.innerHTML = '<p class="text-gray-300">Generating question...</p>';
        
        try {
            const response = await fetch('/api/generate-question', {
                method: 'POST'
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
            this.button.disabled = false;
            this.button.textContent = 'Generate New Question';
        }
    }
}

// Initialize and export for global access
window.aiPrompt = new AIPrompt();
