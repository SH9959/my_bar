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
    divider.dataset.content = content || ''; // 确保内容不为 undefined
    
    // 根据内容设置颜色
    if (content && content.trim() !== '新事项' && content.trim() !== '') {
        divider.style.setProperty('--divider-color', '#2196F3'); // 蓝色
    } else {
        divider.style.setProperty('--divider-color', '#ff4444'); // 红色
    }
    
    // 添加拖动相关事件
    let isDragging = false;
    let startX;
    let startLeft;

    divider.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // 右键点击
            e.preventDefault();
            e.stopPropagation();
            showDeleteConfirmation(divider);
            return;
        }
        if (e.button !== 0) return; // 只响应左键拖动
        isDragging = true;
        startX = e.clientX;
        startLeft = parseFloat(divider.style.left);
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const timeBar = document.getElementById('timeBar');
        const rect = timeBar.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const newPosition = startLeft + (deltaX / rect.width) * 100;
        
        // 限制在时间条范围内
        if (newPosition >= 0 && newPosition <= 100) {
            divider.style.left = `${newPosition}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            saveToLocalStorage(); // 拖动结束后保存位置
        }
    });

    // 点击事件
    divider.addEventListener('click', (e) => {
        if (!isDragging) { // 只有在非拖动状态下才触发点击事件
            e.stopPropagation();
            currentNote = divider;
            showEditor(divider.dataset.content); // 直接使用保存的内容
        }
    });
    
    document.getElementById('timeBar').appendChild(divider);
    return divider;
}

function showEditor(content) {
    const modal = document.getElementById('editModal');
    const markdownInput = document.getElementById('markdownInput');
    
    // 如果内容不是"新事项"，则显示保存的内容
    if (content && content.trim() !== '新事项') {
        markdownInput.value = content;
    } else {
        markdownInput.value = '';
    }
    
    updatePreview(markdownInput.value);
    modal.style.display = 'block';
}

function updatePreview(text) {
    document.getElementById('preview').innerHTML = marked.parse(text);
}

function saveNote() {
    const content = document.getElementById('markdownInput').value;
    currentNote.dataset.content = content;
    
    // 更新线条颜色
    if (content && content.trim() !== '') {
        currentNote.style.setProperty('--divider-color', '#2196F3'); // 蓝色
    } else {
        currentNote.style.setProperty('--divider-color', '#ff4444'); // 红色
    }
    
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

// 添加删除确认弹窗
function showDeleteConfirmation(divider) {
    const modal = document.createElement('div');
    modal.className = 'delete-modal';
    modal.innerHTML = `
        <div class="delete-modal-content">
            <p>确定要删除这个分隔线吗？</p>
            <div class="delete-buttons">
                <button class="confirm-delete">确定</button>
                <button class="cancel-delete">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 确认删除
    modal.querySelector('.confirm-delete').addEventListener('click', () => {
        divider.remove();
        saveToLocalStorage();
        modal.remove();
    });
    
    // 取消删除
    modal.querySelector('.cancel-delete').addEventListener('click', () => {
        modal.remove();
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 添加保存按钮到页面
const saveButton = document.createElement('button');
saveButton.id = 'saveButton';
saveButton.textContent = '保存数据';
document.body.appendChild(saveButton);

// 添加清空按钮到页面
const clearButton = document.createElement('button');
clearButton.id = 'clearButton';
clearButton.textContent = '清空所有';
document.body.appendChild(clearButton);

// 添加按钮样式
const style = document.createElement('style');
style.textContent = `
    #saveButton {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #saveButton:hover {
        background-color: #45a049;
    }
    #clearButton {
        position: fixed;
        bottom: 20px;
        right: 120px;
        padding: 10px 20px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #clearButton:hover {
        background-color: #d32f2f;
    }
`;
document.head.appendChild(style);

// 保存数据到服务器
saveButton.addEventListener('click', async () => {
    const dividers = [...document.querySelectorAll('.divider')];
    const data = dividers.map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));

    try {
        const response = await fetch('/save_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.status === 'success') {
            alert(`数据已保存到: ${result.filepath}`);
        } else {
            alert('保存失败');
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    }
});

// 清空所有内容
clearButton.addEventListener('click', () => {
    const dividers = document.querySelectorAll('.divider');
    dividers.forEach(divider => divider.remove());
    saveToLocalStorage();
    alert('已清空所有内容');
});