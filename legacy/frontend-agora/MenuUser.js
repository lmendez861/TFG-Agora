document.getElementById('userStatusButton').addEventListener('click', function() {
    var menu = document.getElementById('statusMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});

function setStatus(status) {
    var statusIcon = document.getElementById('statusIcon');
    statusIcon.className = 'status-icon ' + status;
    document.getElementById('statusMenu').style.display = 'none';
}