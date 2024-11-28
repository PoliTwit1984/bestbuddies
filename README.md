# Best Buddy Journal

A digital journaling application designed to help preserve memories through text, media, and AI-assisted prompts.

## Overview

Best Buddy Journal is a Flask-based web application that allows users to create and maintain a digital journal with support for text entries, media uploads (images, videos, audio), and AI-generated prompts to inspire meaningful reflection.

## Features

- **Journal Entries**
  - Create and edit rich text entries with formatting
  - Set custom entry dates and times
  - Add tags for organization
  - Upload multiple media files
  - View entries in chronological order
  - Filter entries by tags and date range
  - "Clear Filter" button for resetting filters
  - Automatic timestamp tracking (creation and entry dates)
  - Predefined tags for father's journal context

- **Rich Text Editor**
  - Text formatting (bold, italic)
  - Bulleted and numbered lists
  - Links and quotes
  - Table support
  - Undo/redo functionality
  - Dark theme integration
  - WYSIWYG editing
  - Image upload capability

- **Media Support**
  - Images (jpg, jpeg, png, gif)
  - Videos (mp4, mov, avi)
  - Audio files (mp3, wav, m4a)
  - 10MB file size limit
  - Automatic file type validation
  - Media preview support

- **Tag System**
  - Tag suggestions and autocomplete
  - Predefined contextual tags
  - Tag filtering
  - Custom tag creation
  - Tag management interface
  - Dark theme optimized
  - Known Issue: Tag dropdown currently limited to showing first 10 tags despite configuration

- **AI Integration**
  - AI-generated journal prompts
  - Thoughtful questions for reflection
  - Powered by Anthropic's Claude API

- **User Interface**
  - Modern dark theme
  - Responsive design
  - Real-time file previews
  - Success/error notifications
  - Loading states
  - Date/time picker with current time default
  - Component-based architecture
  - Enhanced tag input interface
  - Darker coral orange accent colors

## Technical Stack

- **Backend**
  - Python 3.13
  - Flask 3.0.0
  - SQLite database
  - Anthropic Claude API

- **Frontend**
  - HTML5 with Jinja2 templates
  - Tailwind CSS
  - CKEditor 5 for rich text editing
  - Modular JavaScript
  - Component-based architecture
  - Tagify for tag management

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd forHayden
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a .env file with your API keys:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

5. Run the application:
   ```bash
   python app.py
   ```

6. Access the application at:
   ```
   http://localhost:5001
   ```

## Project Structure

```
├── app.py                # Main Flask application
├── database/            # Database modules
│   ├── __init__.py     # Database package initialization
│   ├── core.py         # Core Database class
│   ├── entry_manager.py # Entry CRUD operations
│   ├── media_handler.py # Media file operations
│   └── tag_manager.py  # Tag management
├── static/             # Static assets
│   ├── css/           # Stylesheets
│   │   └── styles.css # Custom styles
│   └── js/            # JavaScript modules
│       ├── utils.js   # Utility functions
│       ├── entry-form.js # Entry form handling
│       ├── entries-list.js # Timeline view
│       └── ai-prompt.js # AI prompt generation
├── templates/          # HTML templates
│   ├── components/    # Reusable components
│   │   ├── navbar.html
│   │   ├── notifications.html
│   │   ├── entry_form.html
│   │   ├── entries_list.html
│   │   └── ai_prompt.html
│   ├── layouts/       # Base layouts
│   │   └── base.html
│   └── index.html     # Main template
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
└── media/             # Uploaded media files
```

## Development Guidelines

- File size limit: 10MB per upload
- Supported image formats: jpg, jpeg, png, gif
- Supported video formats: mp4, mov, avi
- Supported audio formats: mp3, wav, m4a
- Entry dates can be set to past or present
- Creation timestamps are automatically tracked
- Follow component-based architecture
- Keep files under 300 lines for maintainability
- Use modular approach for new features
- Dark theme compatibility for all components
- Tag system integration guidelines:
  - Use Tagify for tag input
  - Support both predefined and custom tags
  - Maintain dark theme compatibility
  - Clear input after tag creation
  - Support keyboard navigation
  - Known Issue: Tag dropdown limited to first 10 items
  - All tags properly stored in database but not all showing in dropdown
  - Need to investigate additional Tagify settings affecting dropdown display
- Rich text editor guidelines:
  - Use CKEditor for content editing
  - Maintain dark theme compatibility
  - Ensure proper form validation
  - Support keyboard shortcuts
  - Enable image upload functionality

## Future Enhancements

- Advanced search capabilities
- Timeline view
- Export functionality
- User authentication
- Cloud storage integration
- Date range filtering
- Tag system improvements:
  - Fix tag dropdown limitation
  - Tag drag-and-drop reordering
  - Tag categories
  - Tag statistics
  - Tag relationships

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for the Claude API
- Tailwind CSS for the UI framework
- Flask community for the excellent web framework
- Yaireo for the Tagify library
- CKEditor team for the rich text editor
