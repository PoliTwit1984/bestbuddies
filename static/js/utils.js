// Notification handling
export function showNotification(message, isError = false) {
    const notification = document.getElementById(isError ? 'errorNotification' : 'notification');
    const textElement = document.getElementById(isError ? 'errorText' : 'notificationText');
    textElement.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Date formatting
export function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// File size formatting
export function formatFileSize(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
