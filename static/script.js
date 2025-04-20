// static/script.js
let currentNote = null;

// 初始化加载保存的数据
window.onload = () => {
    // 首先尝试从本地存储加载
    const savedData = localStorage.getItem('timeBarData');
    if (savedData) {
        JSON.parse(savedData).forEach(item => {
            createDivider(item.position, item.content);
        });
    }
    updateStats();
    createCurrentTimePointer();
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
    updateStats();
});

function createDivider(position, content) {
    const divider = document.createElement('div');
    divider.className = 'divider';
    divider.style.left = `${position}%`;
    divider.dataset.content = content || '';
    
    // 添加时间显示
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = getDateFromPosition(position);
    divider.appendChild(timeDisplay);
    
    // 添加摘要显示
    const summaryDisplay = document.createElement('div');
    summaryDisplay.className = 'summary-display';
    summaryDisplay.textContent = getSummary(content);
    divider.appendChild(summaryDisplay);
    
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
            // 更新时间显示
            divider.querySelector('.time-display').textContent = getDateFromPosition(newPosition);
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
    
    // 获取当前分隔线的时间差
    const timeDiff = getTimeDifference(parseFloat(currentNote.style.left));
    
    // 如果内容不是"新事项"，则显示保存的内容
    if (content && content.trim() !== '新事项') {
        markdownInput.value = content;
    } else {
        markdownInput.value = '';
    }
    
    // 更新时间差显示
    const timeDiffText = timeDiff ? `\n\n距离左侧时间点: ${timeDiff}` : '';
    markdownInput.placeholder = `输入Markdown笔记...${timeDiffText}`;
    
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
    
    // 更新摘要显示
    const summaryDisplay = currentNote.querySelector('.summary-display');
    if (summaryDisplay) {
        summaryDisplay.textContent = getSummary(content);
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
    updateStats();
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
        updateStats();
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

// 修改保存按钮的创建和事件处理
const saveButton = document.createElement('button');
saveButton.id = 'saveButton';
saveButton.textContent = '保存到本地';
document.body.appendChild(saveButton);

const saveToServerButton = document.createElement('button');
saveToServerButton.id = 'saveToServerButton';
saveToServerButton.textContent = '保存到服务器';
document.body.appendChild(saveToServerButton);

// 保存到本地
saveButton.addEventListener('click', () => {
    const dividers = [...document.querySelectorAll('.divider')];
    const data = dividers.map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));
    
    // 保存到本地存储
    localStorage.setItem('timeBarData', JSON.stringify(data));
    
    // 下载数据文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timebar_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('数据已保存到本地');
});

// 保存到服务器
saveToServerButton.addEventListener('click', async () => {
    const password = prompt('请输入服务器密码：');
    if (!password) return;
    
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
            body: JSON.stringify({
                data: data,
                password: password
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            alert(`数据已保存到服务器: ${result.filepath}`);
        } else {
            alert('保存失败: ' + result.error);
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    }
});

// 添加清空按钮到页面
const clearButton = document.createElement('button');
clearButton.id = 'clearButton';
clearButton.textContent = '清空所有';
document.body.appendChild(clearButton);

// 修改按钮样式
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
    #saveToServerButton {
        position: fixed;
        bottom: 70px;  // 修改为在保存到本地按钮上方
        right: 20px;
        padding: 10px 20px;
        background-color: #2196F3;  // 使用蓝色区分
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #saveToServerButton:hover {
        background-color: #1976D2;
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
    
    .time-display {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        white-space: nowrap;
    }
    
    .divider:hover .time-display {
        display: block;
    }
    
    .summary-display {
        position: absolute;
        top: 50%;
        right: 100%;  // 改为右侧，这样会显示在分隔线左侧
        transform: translateY(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        white-space: nowrap;
        max-width: 80px;  // 减小最大宽度
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 5px;  // 添加一些间距
    }
    
    .divider:hover .summary-display {
        display: block;
    }

    #statsBox {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background-color: rgba(255, 255, 255, 0.9);
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        z-index: 1000;
    }
    
    #statsBox h3 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    #statsBox ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    #statsBox li {
        margin: 5px 0;
        color: #666;
    }

    .time-pointer {
        position: absolute;
        top: 0;
        height: 100%;
        width: 2px;
        background-color: #ff0000;
        z-index: 10;
    }
    
    .time-pointer::after {
        content: '';
        position: absolute;
        top: 0;
        left: -4px;
        width: 10px;
        height: 10px;
        background-color: #ff0000;
        border-radius: 50%;
    }
`;
document.head.appendChild(style);

// 清空所有内容
clearButton.addEventListener('click', () => {
    const dividers = document.querySelectorAll('.divider');
    dividers.forEach(divider => divider.remove());
    saveToLocalStorage();
    alert('已清空所有内容');
});

function createTimeTicks() {
    const timeTicks = document.querySelector('.time-ticks');
    timeTicks.innerHTML = '';
    
    // 创建从2:00到2:00的刻度（26小时）
    for (let i = 2; i <= 28; i++) {
        const tick = document.createElement('div');
        tick.className = 'time-tick';
        const hour = i % 24;
        const day = i >= 24 ? '' : '';
        tick.setAttribute('data-time', `${day}${hour}:00`);
        timeTicks.appendChild(tick);
    }
}

// 在页面加载时调用
document.addEventListener('DOMContentLoaded', createTimeTicks);

function updateTextareaPlaceholder() {
    const timeBar = document.getElementById('timeBar');
    const currentPosition = timeBar.style.width;
    const currentDate = getDateFromPosition(currentPosition); // 假设您有一个函数可以根据位置获取日期
    document.getElementById('markdownInput').placeholder = `输入Markdown笔记...\n当前刻度: ${currentDate}`;
}

// 在时间条更新时调用此函数
function updateTimeBar() {
    // ... 现有的时间条更新代码 ...
    updateTextareaPlaceholder();
}

function getDateFromPosition(position) {
    // 将百分比位置转换为24小时制的时间（从2:00开始）
    const totalHours = (position / 100) * 26;  // 26小时范围
    const adjustedHours = totalHours + 2;  // 从2:00开始
    const hours = Math.floor(adjustedHours);
    const minutes = Math.floor((adjustedHours - hours) * 60);
    
    // 处理跨天的情况
    const displayHours = hours % 24;
    const dayPrefix = hours >= 24 ? '' : '';
    
    // 格式化时间为 HH:MM 格式
    const formattedHours = displayHours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${dayPrefix}${formattedHours}:${formattedMinutes}`;
}

// 添加获取摘要的函数
function getSummary(content) {
    if (!content) return '';
    
    // 移除 Markdown 标记
    const plainText = content.replace(/[#*`_~]/g, '');
    
    // 只获取前两个字
    return plainText.substring(0, 5);
}

// 修改getTimeDifference函数，使其更精确
function getTimeDifference(currentPosition) {
    const dividers = [...document.querySelectorAll('.divider')];
    
    // 按位置排序所有分隔线
    dividers.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
    
    // 找到当前分隔线的索引
    const currentIndex = dividers.findIndex(d => parseFloat(d.style.left) === currentPosition);
    
    if (currentIndex > 0) {
        // 获取左侧相邻分隔线的位置
        const prevPosition = parseFloat(dividers[currentIndex - 1].style.left);
        const diffHours = (currentPosition - prevPosition) / 100 * 24;
        const hours = Math.floor(diffHours);
        const minutes = Math.round((diffHours - hours) * 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }
    return '';
}

// 添加统计方框
const statsBox = document.createElement('div');
statsBox.id = 'statsBox';
document.body.appendChild(statsBox);

// 更新统计信息
function updateStats() {
    const dividers = [...document.querySelectorAll('.divider')];
    dividers.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
    
    const stats = {
        '工习': 0,
        '阅读': 0,
        '摸鱼': 0,
        '运动': 0,
        '睡眠': 0,
        '通勤': 0,
        '休息': 0,
        '其他': 0
    };
    
    for (let i = 0; i < dividers.length; i++) {
        const currentDivider = dividers[i];
        const content = currentDivider.dataset.content || '未命名';
        
        // 计算当前分隔线到左侧分隔线或起始点的时间
        const currentPosition = parseFloat(currentDivider.style.left);
        let prevPosition;
        
        if (i === 0) {
            prevPosition = 0;
        } else {
            prevPosition = parseFloat(dividers[i - 1].style.left);
        }
        
        const diffHours = (currentPosition - prevPosition) / 100 * 26;
        
        // 根据内容分类
        const category = categorizeContent(content);
        stats[category] += diffHours;
    }
    
    let statsHTML = '<h3>时间统计</h3><ul>';
    for (const [category, hours] of Object.entries(stats)) {
        if (hours > 0) {  // 只显示有时间的类别
            const totalHours = Math.floor(hours);
            const minutes = Math.round((hours - totalHours) * 60);
            statsHTML += `<li>${category}: ${totalHours}小时${minutes}分钟</li>`;
        }
    }
    statsHTML += '</ul>';
    
    statsBox.innerHTML = statsHTML;
}

// 根据内容分类
function categorizeContent(content) {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('学习') || 
        contentLower.includes('上课') || 
        contentLower.includes('作业') || 
        contentLower.includes('开会') || 
        contentLower.includes('工作') || 
        contentLower.includes('写代码') || 
        contentLower.includes('实验') || 
        contentLower.includes('调参') || 
        contentLower.includes('debug') || 
        contentLower.includes('写文档') || 
        contentLower.includes('写报告') || 
        contentLower.includes('写论文') || 
        contentLower.includes('写邮件')) {
        return '工习';  // 修改为 ''
    } else if (contentLower.includes('阅读') || contentLower.includes('看书')) {
        return '阅读';
    } else if (contentLower.includes('摸鱼') || 
               contentLower.includes('游戏') || 
               contentLower.includes('娱乐') || 
               contentLower.includes('走神') || 
               contentLower.includes('发呆') || 
               contentLower.includes('神秘的条') || 
               contentLower.includes('开发')) {
        return '摸鱼';
    } else if (contentLower.includes('运动') || 
               contentLower.includes('健身') || 
               contentLower.includes('跑步')) {
        return '运动';
    } else if (contentLower.includes('睡眠') || 
               contentLower.includes('睡觉')) {
        return '睡眠';
    } else if (contentLower.includes('通勤') || 
               contentLower.includes('交通')) {
        return '通勤';
    } else if (contentLower.includes('休息') || 
               contentLower.includes('午休') || 
               contentLower.includes('吃饭') || 
               contentLower.includes('午睡') || 
               contentLower.includes('洗漱')) {
        return '休息';
    } else {
        return '其他';
    }
}

// 添加当前时间指针
function createCurrentTimePointer() {
    const pointer = document.createElement('div');
    pointer.id = 'currentTimePointer';
    pointer.className = 'time-pointer';
    document.getElementById('timeBar').appendChild(pointer);
    
    // 初始更新指针位置
    updateCurrentTimePointer();
    
    // 每分钟更新一次指针位置
    setInterval(updateCurrentTimePointer, 60000);
}

function updateCurrentTimePointer() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 计算当前时间在26小时范围内的位置（从2:00开始）
    let totalHours = hours + minutes / 60;
    if (totalHours < 2) {
        totalHours += 24; // 处理凌晨时间
    }
    totalHours -= 2; // 从2:00开始
    
    // 计算百分比位置
    const position = (totalHours / 26) * 100;
    
    const pointer = document.getElementById('currentTimePointer');
    if (pointer) {
        pointer.style.left = `${position}%`;
    }
}