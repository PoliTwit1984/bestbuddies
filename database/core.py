import sqlite3
import os
from .media_handler import MediaHandler
from .tag_manager import TagManager
from .entry_manager import EntryManager

class Database:
    def __init__(self):
        # Initialize paths
        self.db_path = 'journal.db'
        self.media_path = 'media'
        
        # Create media directory if it doesn't exist
        os.makedirs(self.media_path, exist_ok=True)
        
        # Initialize managers
        self.media_handler = MediaHandler()
        self.tag_manager = TagManager()
        self.entry_manager = EntryManager(self.media_handler, self.tag_manager)
        
        # Initialize database with tables
        self._init_db()

    def _init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Start transaction
            cursor.execute('BEGIN')

            # Create entries table if not exists
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS entries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    entry_date TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')

            # Add entry_date column if it doesn't exist
            cursor.execute("PRAGMA table_info(entries)")
            columns = {row[1] for row in cursor.fetchall()}
            if 'entry_date' not in columns:
                cursor.execute('ALTER TABLE entries ADD COLUMN entry_date TEXT')
                # Set existing entries' entry_date to their created_at date
                cursor.execute('UPDATE entries SET entry_date = created_at WHERE entry_date IS NULL')

            # Create tags table if not exists
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    count INTEGER DEFAULT 1
                )
            ''')

            # Create entry_tags table if not exists
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS entry_tags (
                    entry_id TEXT,
                    tag_id TEXT,
                    FOREIGN KEY (entry_id) REFERENCES entries (id),
                    FOREIGN KEY (tag_id) REFERENCES tags (id)
                )
            ''')

            # Check if media table exists and has the new columns
            cursor.execute("PRAGMA table_info(media)")
            columns = {row[1] for row in cursor.fetchall()}

            if not columns:
                # Create new media table
                cursor.execute('''
                    CREATE TABLE media (
                        id TEXT PRIMARY KEY,
                        entry_id TEXT,
                        filename TEXT NOT NULL,
                        filepath TEXT NOT NULL,
                        file_type TEXT DEFAULT 'image',
                        file_size INTEGER DEFAULT 0,
                        FOREIGN KEY (entry_id) REFERENCES entries (id)
                    )
                ''')
            elif 'file_type' not in columns or 'file_size' not in columns:
                # Backup existing media table
                cursor.execute('ALTER TABLE media RENAME TO media_old')
                
                # Create new media table with all columns
                cursor.execute('''
                    CREATE TABLE media (
                        id TEXT PRIMARY KEY,
                        entry_id TEXT,
                        filename TEXT NOT NULL,
                        filepath TEXT NOT NULL,
                        file_type TEXT DEFAULT 'image',
                        file_size INTEGER DEFAULT 0,
                        FOREIGN KEY (entry_id) REFERENCES entries (id)
                    )
                ''')
                
                # Copy data from old table to new table
                cursor.execute('''
                    INSERT INTO media (id, entry_id, filename, filepath)
                    SELECT id, entry_id, filename, filepath FROM media_old
                ''')
                
                # Drop old table
                cursor.execute('DROP TABLE media_old')

            # Commit transaction
            conn.commit()

        except Exception as e:
            print(f"Error initializing database: {str(e)}")
            conn.rollback()
            raise e
        finally:
            conn.close()

    def create_entry(self, user_id, title, content, tags, entry_date=None, media_files=None):
        """Create a new journal entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            entry_id = self.entry_manager.create_entry(
                cursor, user_id, title, content, tags, entry_date, media_files, self.media_path
            )
            conn.commit()
            return entry_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_entry(self, user_id, entry_id):
        """Get a specific journal entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            return self.entry_manager.get_entry(cursor, user_id, entry_id)
        finally:
            conn.close()

    def get_entries(self, user_id, tag=None, start_date=None, end_date=None):
        """Get journal entries with optional filtering"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            return self.entry_manager.get_entries(cursor, user_id, tag, start_date, end_date)
        finally:
            conn.close()

    def update_entry(self, user_id, entry_id, title=None, content=None, entry_date=None, 
                    tags=None, new_media_files=None):
        """Update an existing journal entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            success = self.entry_manager.update_entry(
                cursor, user_id, entry_id, title, content, entry_date, 
                tags, new_media_files, self.media_path
            )
            conn.commit()
            return success
        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()

    def delete_entry(self, user_id, entry_id):
        """Delete a journal entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            success = self.entry_manager.delete_entry(cursor, user_id, entry_id, self.media_path)
            conn.commit()
            return success
        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_tags(self, user_id):
        """Get all tags for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            return self.tag_manager.get_all_tags(cursor, user_id)
        finally:
            conn.close()
