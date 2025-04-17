// static/script.js
let currentNote = null;

// 初始化加载保存的数据
window.onload = () => {
    const savedData = localStorage.getItem('timeBarData');
    if (savedData) {
        JSON.parse(savedData).forEach(item => {
            createDivider(item.position, item.content);
        });
    }
};

document.getElementById('timeBar').addEventListener('click', (e) => {
    // 排除子元素和右键点击
    if (e.target !== e.currentTarget || e.button !== 0) return;
    
    // 计算点击位置百分比
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const position = (clickX / rect.width) * 100;
    
    // 创建新分隔线
    const newDivider = createDivider(position, '新事项');
    newDivider.style.setProperty('--divider-color', '#ff9999'); // 浅红色
    newDivider.dataset.type = 'temporary'; // 添加类型标识
    
    // 保存到本地存储
    saveToLocalStorage();
});

function createDivider(position, content) {
    const divider = document.createElement('div');
    divider.className = 'divider';
    divider.style.left = `${position}%`;
    divider.dataset.content = content;
    
    divider.addEventListener('click', (e) => {
        e.stopPropagation();
        currentNote = divider;
        showEditor(content);
    });
    
    // 添加颜色变量
    divider.style.setProperty('--divider-color', '#ff4444'); // 默认红色
    
    document.getElementById('timeBar').appendChild(divider);
    return divider;
}

function showEditor(content) {
    const modal = document.getElementById('editModal');
    document.getElementById('markdownInput').value = content;
    updatePreview(content);
    modal.style.display = 'block';
}

function updatePreview(text) {
    document.getElementById('preview').innerHTML = marked.parse(text);
}

function saveNote() {
    const content = document.getElementById('markdownInput').value;
    currentNote.dataset.content = content;
    document.getElementById('editModal').style.display = 'none';
    saveToLocalStorage();
    updatePreview(content);
}

function saveToLocalStorage() {
    const items = [...document.querySelectorAll('.divider')].map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));
    localStorage.setItem('timeBarData', JSON.stringify(items));
}

// 关闭弹窗
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

// 实时预览
document.getElementById('markdownInput').addEventListener('input', (e) => {
    updatePreview(e.target.value);
});