from flask import Flask, render_template, request, jsonify, send_file, url_for, send_from_directory
from database import Database
from dotenv import load_dotenv
import os
import anthropic
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
db = Database()
client = anthropic.Client(api_key=os.getenv('ANTHROPIC_API_KEY'))

# For demo purposes, using a static user_id
DEMO_USER_ID = "demo_user"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/entries', methods=['GET'])
def get_entries():
    tag = request.args.get('tag')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        entries = db.get_entries(DEMO_USER_ID, tag, start_date, end_date)
        
        # Convert local file paths to URLs
        for entry in entries:
            if entry.get('media'):
                media_list = []
                for media in entry['media']:
                    try:
                        # Get relative path from media directory
                        rel_path = os.path.relpath(media['filepath'], 'media')
                        media_list.append({
                            'filename': media['filename'],
                            'url': url_for('serve_media', filename=rel_path, _external=True),
                            'type': media['type'],
                            'size': media['size']
                        })
                    except Exception as e:
                        print(f"Error processing media file: {str(e)}")
                        continue
                entry['media'] = media_list
        
        return jsonify(entries)
    except Exception as e:
        print(f"Error getting entries: {str(e)}")
        return jsonify({'error': 'Failed to load entries'}), 500

@app.route('/api/entries', methods=['POST'])
def create_entry():
    try:
        print("\n=== Creating New Entry ===")
        data = request.form
        print("Form data:", dict(data))
        
        title = data.get('title')
        content = data.get('content')
        entry_date = data.get('entry_date')
        
        print(f"Title: {title}")
        print(f"Content length: {len(content) if content else 0}")
        print(f"Entry date: {entry_date}")
        
        if not title or not content:
            print("Missing required fields")
            return jsonify({'error': 'Title and content are required'}), 400
        
        if not entry_date:
            entry_date = datetime.utcnow().isoformat()
            print(f"Using default entry date: {entry_date}")
        
        # Process tags
        tags = []
        if data.get('tags'):
            tags = [tag.strip() for tag in data.get('tags').split(',') if tag.strip()]
            print(f"Processing tags from form data: {tags}")
        
        media_files = request.files.getlist('media')
        print(f"Number of media files: {len(media_files)}")
        
        entry_id = db.create_entry(
            DEMO_USER_ID,
            title,
            content,
            tags,
            entry_date,
            media_files if media_files else None
        )
        
        print(f"Entry created successfully with ID: {entry_id}")
        
        # Get updated list of tags
        all_tags = db.get_tags(DEMO_USER_ID)
        print(f"Current tags in database after entry creation: {all_tags}")
        
        return jsonify({'entry_id': entry_id})
    except Exception as e:
        print(f"Error creating entry: {str(e)}")
        return jsonify({'error': f'Failed to create entry: {str(e)}'}), 500

@app.route('/api/entries/<entry_id>', methods=['PUT'])
def update_entry(entry_id):
    try:
        data = request.form
        title = data.get('title')
        content = data.get('content')
        entry_date = data.get('entry_date')
        tags = data.get('tags', '').split(',') if data.get('tags') else None
        if tags:
            tags = [tag.strip() for tag in tags if tag.strip()]
        media_files = request.files.getlist('media')
        
        success = db.update_entry(
            DEMO_USER_ID,
            entry_id,
            title,
            content,
            entry_date,
            tags,
            media_files if media_files else None
        )
        
        return jsonify({'success': success})
    except Exception as e:
        print(f"Error updating entry: {str(e)}")
        return jsonify({'error': 'Failed to update entry'}), 500

@app.route('/api/entries/<entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    try:
        success = db.delete_entry(DEMO_USER_ID, entry_id)
        return jsonify({'success': success})
    except Exception as e:
        print(f"Error deleting entry: {str(e)}")
        return jsonify({'error': 'Failed to delete entry'}), 500

@app.route('/api/tags', methods=['GET'])
def get_tags():
    try:
        print("\n=== Getting Tags ===")
        tags = db.get_tags(DEMO_USER_ID)
        print(f"Retrieved tags: {tags}")
        return jsonify(tags)
    except Exception as e:
        print(f"Error getting tags: {str(e)}")
        return jsonify({'error': 'Failed to load tags'}), 500

@app.route('/media/<path:filename>')
def serve_media(filename):
    try:
        return send_from_directory('media', filename)
    except Exception as e:
        print(f"Error serving media file: {str(e)}")
        return jsonify({'error': 'Media file not found'}), 404

@app.route('/api/generate-question', methods=['POST'])
def generate_question():
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Generate a thoughtful journal prompt that helps capture meaningful memories and life experiences. The prompt should encourage deep reflection and detailed responses."
                        }
                    ]
                }
            ]
        )
        
        # Extract the text from the response
        question = message.content[0].text
        return jsonify({'question': question})
    except Exception as e:
        print(f"Error generating question: {str(e)}")
        # Return a default question if the API fails
        default_question = "What is a meaningful memory from your past that has shaped who you are today?"
        return jsonify({'question': default_question})

if __name__ == '__main__':
    # Use port 5001 to avoid conflicts with AirPlay
    app.run(debug=True, port=5001)
