class TagManager:
    @staticmethod
    def update_entry_tags(cursor, user_id, entry_id, tags):
        """Update tags for an entry"""
        if tags is None:
            return

        # Remove old tags
        cursor.execute('DELETE FROM entry_tags WHERE entry_id = ?', (entry_id,))
        
        # Add new tags
        for tag in tags:
            tag = tag.strip()
            if tag:
                # Use lowercase version for ID but preserve original case for display
                tag_id = f"{user_id}_{tag.lower()}"
                
                # Insert or update tag
                cursor.execute('''
                    INSERT OR REPLACE INTO tags (id, user_id, tag, count)
                    VALUES (?, ?, ?, COALESCE(
                        (SELECT count + 1 FROM tags WHERE id = ?), 1
                    ))
                ''', (tag_id, user_id, tag, tag_id))
                
                # Create entry-tag relationship
                cursor.execute('''
                    INSERT INTO entry_tags (entry_id, tag_id)
                    VALUES (?, ?)
                ''', (entry_id, tag_id))

    @staticmethod
    def get_entry_tags(cursor, entry_id):
        """Get tags for a specific entry"""
        cursor.execute('''
            SELECT t.tag
            FROM tags t
            JOIN entry_tags et ON t.id = et.tag_id
            WHERE et.entry_id = ?
        ''', (entry_id,))
        
        return [row[0] for row in cursor.fetchall()]

    @staticmethod
    def get_all_tags(cursor, user_id):
        """Get all tags for a user with their counts"""
        cursor.execute('''
            SELECT tag, count
            FROM tags
            WHERE user_id = ?
            ORDER BY count DESC
        ''', (user_id,))
        
        return [{'tag': row[0], 'count': row[1]} for row in cursor.fetchall()]

    @staticmethod
    def cleanup_entry_tags(cursor, entry_id):
        """Remove all tags for an entry"""
        cursor.execute('DELETE FROM entry_tags WHERE entry_id = ?', (entry_id,))
