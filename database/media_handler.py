import os
import shutil
import uuid

class MediaHandler:
    def __init__(self):
        self.ALLOWED_EXTENSIONS = {
            'image': ['jpg', 'jpeg', 'png', 'gif'],
            'video': ['mp4', 'mov', 'avi'],
            'audio': ['mp3', 'wav', 'm4a']
        }
        self.MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

    def allowed_file(self, filename):
        """Check if file type is allowed"""
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        return any(ext in types for types in self.ALLOWED_EXTENSIONS.values())

    def get_file_type(self, filename):
        """Get the type of file based on extension"""
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        for file_type, extensions in self.ALLOWED_EXTENSIONS.items():
            if ext in extensions:
                return file_type
        return None

    def validate_media_file(self, media_file):
        """Validate media file type and size"""
        if not media_file.filename:
            return False, "No file selected"
            
        if not self.allowed_file(media_file.filename):
            return False, "File type not allowed"
            
        # Check file size
        media_file.seek(0, os.SEEK_END)
        size = media_file.tell()
        media_file.seek(0)  # Reset file pointer
        
        if size > self.MAX_FILE_SIZE:
            return False, f"File too large. Maximum size is {self.MAX_FILE_SIZE // (1024 * 1024)}MB"
            
        return True, None

    def save_media_files(self, cursor, entry_id, media_files, media_path):
        """Save media files and create database records"""
        if not media_files:
            return

        entry_media_dir = os.path.join(media_path, entry_id)
        os.makedirs(entry_media_dir, exist_ok=True)

        for media_file in media_files:
            if media_file.filename:
                # Validate file
                is_valid, error_message = self.validate_media_file(media_file)
                if not is_valid:
                    raise ValueError(f"Invalid media file: {error_message}")
                
                media_id = str(uuid.uuid4())
                safe_filename = f"{media_id}_{media_file.filename}"
                filepath = os.path.join(entry_media_dir, safe_filename)
                
                # Get file size and type
                media_file.seek(0, os.SEEK_END)
                file_size = media_file.tell()
                media_file.seek(0)
                file_type = self.get_file_type(media_file.filename)
                
                # Save file
                media_file.save(filepath)
                
                # Save media record
                cursor.execute('''
                    INSERT INTO media (id, entry_id, filename, filepath, file_type, file_size)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (media_id, entry_id, media_file.filename, filepath, file_type, file_size))

    def delete_media_files(self, entry_id, media_path):
        """Delete media files for an entry"""
        media_dir = os.path.join(media_path, entry_id)
        if os.path.exists(media_dir):
            shutil.rmtree(media_dir)
