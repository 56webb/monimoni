document.addEventListener('DOMContentLoaded', () => {
    // 狀態
    let channels = JSON.parse(localStorage.getItem('yt-monitor-channels')) || [];
    let activeChannels = [];
    const MAX_CHANNELS = 9;

    // DOM 元素
    const monitorGrid = document.getElementById('monitor-grid');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const dashboardModal = document.getElementById('dashboard-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addYtBtn = document.getElementById('add-yt-btn');
    const ytUrlInput = document.getElementById('yt-url-input');
    const channelList = document.getElementById('channel-list');
    const libraryCount = document.getElementById('library-count');
    const activeCount = document.getElementById('active-count');

    // 初始化
    renderChannelList();

    // 事件監聽器
    dashboardBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    dashboardModal.addEventListener('click', (e) => {
        if (e.target === dashboardModal) closeModal();
    });

    addYtBtn.addEventListener('click', handleAddChannel);
    ytUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddChannel();
    });

    // 處理空狀態按鈕綁定 (使用事件委派，因按鈕會被重新渲染)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'empty-add-btn') {
            openModal();
        }
    });

    // 輔助函數
    function extractVideoId(url) {
        // 處理各種 YouTube URL 格式
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return match[2];
        }
        // 如果輸入剛好是 11 個字元，假設它就是 ID
        if (url.length === 11) {
            return url;
        }
        return null;
    }

    async function fetchVideoDetails(videoId) {
        // 使用 noembed 取得基本資訊，如失敗則給予預設值
        try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();
            if (data.error) throw new Error('Video not found');
            return {
                id: videoId,
                title: data.title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                addedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                id: videoId,
                title: `YouTube 影片 (${videoId})`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                addedAt: new Date().toISOString()
            };
        }
    }

    async function handleAddChannel() {
        const input = ytUrlInput.value.trim();
        if (!input) return;

        const videoId = extractVideoId(input);
        if (!videoId) {
            alert('請輸入有效的 YouTube 網址或影片 ID');
            return;
        }

        // 檢查是否已存在
        if (channels.some(c => c.id === videoId)) {
            alert('此頻道已在您的清單中');
            ytUrlInput.value = '';
            return;
        }

        // 顯示載入狀態
        const originalBtnText = addYtBtn.innerHTML;
        addYtBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 載入中';
        addYtBtn.disabled = true;

        try {
            const videoDetails = await fetchVideoDetails(videoId);
            channels.push(videoDetails);
            saveChannels();
            renderChannelList();
            ytUrlInput.value = '';
        } catch (error) {
            alert('無法獲取影片資訊，請確認連結正確');
        } finally {
            addYtBtn.innerHTML = originalBtnText;
            addYtBtn.disabled = false;
        }
    }

    function removeChannelFromLibrary(id) {
        if (confirm('確定要從頻道庫刪除此頻道嗎？')) {
            channels = channels.filter(c => c.id !== id);
            saveChannels();
            
            // 如果此頻道正在監看中，也將其從畫面移除
            if (activeChannels.includes(id)) {
                toggleMonitor(id);
            } else {
                renderChannelList();
            }
        }
    }

    function toggleMonitor(id) {
        const index = activeChannels.indexOf(id);
        if (index > -1) {
            // 從監看中移除
            activeChannels.splice(index, 1);
        } else {
            // 加入監看
            if (activeChannels.length >= MAX_CHANNELS) {
                alert(`最多只能同時監看 ${MAX_CHANNELS} 個頻道！`);
                return;
            }
            activeChannels.push(id);
        }
        
        updateGrid();
        renderChannelList();
    }

    function updateGrid() {
        monitorGrid.innerHTML = '';
        
        // 移除先前的網格類別
        monitorGrid.classList.remove('empty');
        for (let i = 1; i <= 9; i++) {
            monitorGrid.classList.remove(`grid-${i}`);
        }

        const count = activeChannels.length;
        activeCount.textContent = `${count} / ${MAX_CHANNELS} 頻道`;

        if (count === 0) {
            monitorGrid.classList.add('empty');
            monitorGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-brands fa-youtube"></i>
                    <h2>系統待命中</h2>
                    <p>請開啟控制面板新增並選擇要監控的頻道</p>
                    <button id="empty-add-btn" class="glow-btn outline">開啟控制面板</button>
                </div>
            `;
            return;
        }

        monitorGrid.classList.add(`grid-${count}`);

        activeChannels.forEach(id => {
            const channel = channels.find(c => c.id === id);
            if (!channel) return;

            const cell = document.createElement('div');
            cell.className = 'monitor-cell';
            
            // 使用 autoplay=1 & mute=1 允許自動播放
            cell.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=1&origin=https://www.youtube.com" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
                <div class="cell-overlay">
                    <div class="cell-title" style="color: white; text-shadow: 1px 1px 3px black; font-size: 0.95rem; font-weight: 500; max-width: 75%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${channel.title}
                    </div>
                    <button class="remove-monitor-btn" data-id="${id}">
                        <i class="fa-solid fa-xmark"></i> 關閉
                    </button>
                </div>
            `;
            monitorGrid.appendChild(cell);
        });

        // 綁定關閉按鈕事件
        document.querySelectorAll('.remove-monitor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                toggleMonitor(id);
            });
        });
    }

    function renderChannelList() {
        channelList.innerHTML = '';
        libraryCount.textContent = channels.length;

        if (channels.length === 0) {
            channelList.innerHTML = '<li style="text-align: center; color: var(--text-muted); padding: 20px;">尚無儲存的頻道，請在上方新增</li>';
            return;
        }

        // 依照加入時間倒序排列
        const sortedChannels = [...channels].reverse();

        sortedChannels.forEach(channel => {
            const isActive = activeChannels.includes(channel.id);
            const li = document.createElement('li');
            li.className = 'channel-item';
            li.innerHTML = `
                <div class="channel-info">
                    <div class="channel-thumb" style="background-image: url('${channel.thumbnail}')"></div>
                    <div class="channel-details">
                        <span class="channel-title" title="${channel.title}">${channel.title}</span>
                        <span class="channel-id">${channel.id}</span>
                    </div>
                </div>
                <div class="channel-actions">
                    <button class="watch-btn ${isActive ? 'active' : ''}" data-id="${channel.id}">
                        <i class="fa-solid ${isActive ? 'fa-stop' : 'fa-play'}"></i>
                        ${isActive ? '停止' : '監看'}
                    </button>
                    <button class="delete-btn" data-id="${channel.id}">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            channelList.appendChild(li);
        });

        // 綁定列表按鈕事件
        document.querySelectorAll('.watch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                toggleMonitor(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                removeChannelFromLibrary(id);
            });
        });
    }

    function saveChannels() {
        localStorage.setItem('yt-monitor-channels', JSON.stringify(channels));
    }

    function openModal() {
        dashboardModal.classList.remove('hidden');
        ytUrlInput.focus();
    }

    function closeModal() {
        dashboardModal.classList.add('hidden');
    }
});
