function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');

    sidebar.classList.toggle('hidden');
    container.classList.toggle('full');
}
