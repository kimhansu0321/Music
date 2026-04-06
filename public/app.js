const apiUrl = 'http://localhost:8080/api/music';

document.addEventListener('DOMContentLoaded', () => {
    fetchMusic();
    
    // Form submission
    const form = document.getElementById('musicForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const artist = document.getElementById('artist').value;
        const genre = document.getElementById('genre').value;
        const youtubeUrl = document.getElementById('youtubeUrl').value;
        const reason = document.getElementById('reason').value;
        
        const data = { title, artist, genre, youtube_id: youtubeUrl, reason };
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                form.reset();
                fetchMusic(); // Reload feed
                alert('음악이 성공적으로 추천되었습니다!');
            } else {
                alert('등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('서버 연결에 문제가 발생했습니다.');
        }
    });

    // Filtering logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            
            const genre = e.target.getAttribute('data-genre');
            filterMusicGrid(genre);
        });
    });
});

async function fetchMusic() {
    try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        renderMusic(result.data);
    } catch (error) {
        console.error('Error fetching music:', error);
        document.getElementById('musicList').innerHTML = '<div class="loading">데이터를 불러오는데 실패했습니다. 서버가 켜져있는지 확인해주세요.</div>';
    }
}

function renderMusic(musicArray) {
    const musicList = document.getElementById('musicList');
    musicList.innerHTML = '';
    
    if (musicArray.length === 0) {
        musicList.innerHTML = '<div class="loading">아직 추천된 음악이 없습니다. 첫 번째로 음악을 추천해보세요!</div>';
        return;
    }

    musicArray.forEach(music => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.setAttribute('data-genre', music.genre);
        
        let mediaHtml = '';
        if (music.youtube_id) {
            mediaHtml = `
            <div class="video-container">
                <iframe src="https://www.youtube.com/embed/${music.youtube_id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>`;
        } else {
            mediaHtml = `
            <div style="height: 150px; background: linear-gradient(45deg, #6C5CE7, #a29bfe); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;">
                🎵
            </div>`;
        }
        
        const likedSongs = getLikedSongs();
        const isLiked = likedSongs.includes(music.id);
        const likedClass = isLiked ? 'liked' : '';

        card.innerHTML = `
            ${mediaHtml}
            <div class="card-content">
                <div>
                    <span class="tag">${music.genre}</span>
                    <h3 class="card-title">${escapeHTML(music.title)}</h3>
                    <p class="card-artist">${escapeHTML(music.artist)}</p>
                </div>
                <div class="card-reason">
                    "${escapeHTML(music.reason).replace(/\\n/g, '<br>')}"
                </div>
                <div class="card-footer">
                    <button id="like-btn-${music.id}" class="like-btn ${likedClass}" onclick="toggleLike(${music.id})">
                        ❤️ <span id="like-count-${music.id}">${music.likes}</span>
                    </button>
                    <button class="delete-btn" onclick="deleteMusic(${music.id})">삭제</button>
                </div>
                <div class="comments-section">
                    <form class="comment-form" onsubmit="addComment(event, ${music.id})">
                        <input type="text" id="comment-input-${music.id}" placeholder="댓글 달기..." required>
                        <button type="submit">작성</button>
                    </form>
                    <div id="comments-${music.id}" class="comments-list">
                        <div style="font-size: 0.85rem; color: #999;">댓글 불러오는 중...</div>
                    </div>
                </div>
            </div>
        `;
        musicList.appendChild(card);
        loadComments(music.id);
    });
}

function filterMusicGrid(genre) {
    const cards = document.querySelectorAll('.music-card');
    cards.forEach(card => {
        if (genre === 'all' || card.getAttribute('data-genre') === genre) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function getLikedSongs() {
    return JSON.parse(localStorage.getItem('likedSongs') || '[]');
}

async function toggleLike(id) {
    const likedSongs = getLikedSongs();
    const isLiked = likedSongs.includes(id);
    const countSpan = document.getElementById(`like-count-${id}`);
    const btn = document.getElementById(`like-btn-${id}`);
    
    try {
        if (isLiked) {
            const response = await fetch(`${apiUrl}/${id}/unlike`, { method: 'POST' });
            if (response.ok) {
                const updatedList = likedSongs.filter(songId => songId !== id);
                localStorage.setItem('likedSongs', JSON.stringify(updatedList));
                countSpan.innerText = parseInt(countSpan.innerText) - 1;
                btn.classList.remove('liked');
            }
        } else {
            const response = await fetch(`${apiUrl}/${id}/like`, { method: 'POST' });
            if (response.ok) {
                likedSongs.push(id);
                localStorage.setItem('likedSongs', JSON.stringify(likedSongs));
                countSpan.innerText = parseInt(countSpan.innerText) + 1;
                btn.classList.add('liked');
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

async function loadComments(musicId) {
    try {
        const response = await fetch(`${apiUrl}/${musicId}/comments`);
        const result = await response.json();
        const commentsDiv = document.getElementById(`comments-${musicId}`);
        if(result.data.length === 0) {
            commentsDiv.innerHTML = '<div style="color: #999; font-size: 0.85rem; padding: 0.5rem 0;">아직 댓글이 없습니다.</div>';
            return;
        }
        commentsDiv.innerHTML = result.data.map(comment => `
            <div class="comment-item">
                <p>${escapeHTML(comment.text)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}

async function addComment(e, musicId) {
    e.preventDefault();
    const input = document.getElementById(`comment-input-${musicId}`);
    const text = input.value.trim();
    if(!text) return;
    
    try {
        const response = await fetch(`${apiUrl}/${musicId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if(response.ok) {
            input.value = '';
            loadComments(musicId);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

async function deleteMusic(id) {
    if (confirm('정말로 이 추천을 삭제하시겠습니까?')) {
        try {
            const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchMusic();
            }
        } catch (error) {
            console.error('Error deleting music:', error);
        }
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
