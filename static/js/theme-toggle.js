document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check localStorage for theme preference
    let theme = localStorage.getItem('theme') || 'dark';
    setTheme(theme);

    themeToggleBtn.addEventListener('click', function() {
        theme = (theme === 'dark') ? 'light' : 'dark';
        setTheme(theme);
    });

    function setTheme(theme) {
        if (theme === 'dark') {
            htmlElement.classList.add('dark-theme');
            htmlElement.classList.remove('light-theme');
            themeToggleBtn.textContent = 'Switch to Light Mode';
        } else {
            htmlElement.classList.add('light-theme');
            htmlElement.classList.remove('dark-theme');
            themeToggleBtn.textContent = 'Switch to Dark Mode';
        }
        localStorage.setItem('theme', theme);
    }
});
