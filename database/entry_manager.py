from datetime import datetime
import uuid

class EntryManager:
    def __init__(self, media_handler, tag_manager):
        self.media_handler = media_handler
        self.tag_manager = tag_manager

    def create_entry(self, cursor, user_id, title, content, tags, entry_date=None, media_files=None, media_path=None):
        """Create a new journal entry with optional media files"""
        entry_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        entry_date = entry_date or timestamp
        
        # Insert entry
        cursor.execute('''
            INSERT INTO entries (id, user_id, title, content, entry_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (entry_id, user_id, title, content, entry_date, timestamp, timestamp))
        
        # Handle media files
        if media_files:
            self.media_handler.save_media_files(cursor, entry_id, media_files, media_path)
        
        # Handle tags
        if tags:
            self.tag_manager.update_entry_tags(cursor, user_id, entry_id, tags)
        
        return entry_id

    def get_entry(self, cursor, user_id, entry_id):
        """Retrieve a specific journal entry"""
        # Get entry
        cursor.execute('''
            SELECT id, title, content, entry_date, created_at, updated_at
            FROM entries
            WHERE id = ? AND user_id = ?
        ''', (entry_id, user_id))
        
        entry = cursor.fetchone()
        if not entry:
            return None
            
        # Get tags
        tags = self.tag_manager.get_entry_tags(cursor, entry_id)
        
        # Get media files
        cursor.execute('''
            SELECT filename, filepath, file_type, file_size
            FROM media
            WHERE entry_id = ?
        ''', (entry_id,))
        
        media = [{
            'filename': row[0],
            'filepath': row[1],
            'type': row[2] or 'image',  # Default to 'image' if NULL
            'size': row[3] or 0  # Default to 0 if NULL
        } for row in cursor.fetchall()]
        
        return {
            'id': entry[0],
            'title': entry[1],
            'content': entry[2],
            'entry_date': entry[3],
            'created_at': entry[4],
            'updated_at': entry[5],
            'tags': tags,
            'media': media
        }

    def get_entries(self, cursor, user_id, tag=None, start_date=None, end_date=None):
        """Get journal entries with optional filtering"""
        query = '''
            SELECT DISTINCT e.id, e.title, e.content, e.entry_date, e.created_at, e.updated_at
            FROM entries e
        '''
        params = [user_id]
        
        if tag:
            query += '''
                JOIN entry_tags et ON e.id = et.entry_id
                JOIN tags t ON et.tag_id = t.id
                WHERE t.tag = ? AND e.user_id = ?
            '''
            params = [tag, user_id]
        else:
            query += ' WHERE e.user_id = ?'
        
        if start_date:
            query += ' AND e.entry_date >= ?'
            params.append(start_date)
        if end_date:
            query += ' AND e.entry_date <= ?'
            params.append(end_date)
            
        query += ' ORDER BY e.entry_date DESC'
        
        cursor.execute(query, params)
        entries = []
        
        for row in cursor.fetchall():
            entry_id = row[0]
            tags = self.tag_manager.get_entry_tags(cursor, entry_id)
            
            # Get media for entry
            cursor.execute('''
                SELECT filename, filepath, file_type, file_size
                FROM media
                WHERE entry_id = ?
            ''', (entry_id,))
            
            media = [{
                'filename': r[0],
                'filepath': r[1],
                'type': r[2] or 'image',  # Default to 'image' if NULL
                'size': r[3] or 0  # Default to 0 if NULL
            } for r in cursor.fetchall()]
            
            entries.append({
                'id': entry_id,
                'title': row[1],
                'content': row[2],
                'entry_date': row[3],
                'created_at': row[4],
                'updated_at': row[5],
                'tags': tags,
                'media': media
            })
        
        return entries

    def update_entry(self, cursor, user_id, entry_id, title=None, content=None, entry_date=None, 
                    tags=None, new_media_files=None, media_path=None):
        """Update an existing journal entry"""
        # Verify entry exists and belongs to user
        cursor.execute('''
            SELECT 1 FROM entries
            WHERE id = ? AND user_id = ?
        ''', (entry_id, user_id))
        
        if not cursor.fetchone():
            return False
        
        # Update entry fields
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = ?')
            params.append(title)
        if content is not None:
            updates.append('content = ?')
            params.append(content)
        if entry_date is not None:
            updates.append('entry_date = ?')
            params.append(entry_date)
            
        if updates:
            updates.append('updated_at = ?')
            params.extend([datetime.utcnow().isoformat(), entry_id, user_id])
            
            cursor.execute(f'''
                UPDATE entries
                SET {', '.join(updates)}
                WHERE id = ? AND user_id = ?
            ''', params)
        
        # Handle new media files
        if new_media_files:
            self.media_handler.save_media_files(cursor, entry_id, new_media_files, media_path)
        
        # Update tags if provided
        if tags is not None:
            self.tag_manager.update_entry_tags(cursor, user_id, entry_id, tags)
        
        return True

    def delete_entry(self, cursor, user_id, entry_id, media_path):
        """Delete a journal entry and its associated media files"""
        # Verify entry exists and belongs to user
        cursor.execute('''
            SELECT 1 FROM entries
            WHERE id = ? AND user_id = ?
        ''', (entry_id, user_id))
        
        if not cursor.fetchone():
            return False
        
        # Delete media files
        self.media_handler.delete_media_files(entry_id, media_path)
        
        # Delete from database
        cursor.execute('DELETE FROM media WHERE entry_id = ?', (entry_id,))
        self.tag_manager.cleanup_entry_tags(cursor, entry_id)
        cursor.execute('DELETE FROM entries WHERE id = ?', (entry_id,))
        
        return True
