document.addEventListener("DOMContentLoaded", () => {
    // Get the last part of the URL path
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    // Determine if this is the current user's own profile
    const isOwnProfile = !lastPart ||
                         lastPart === 'profile' ||
                         lastPart === 'profile.html' ||
                         lastPart.endsWith('.html') ||
                         lastPart === '';

    // Only set username if it's actually another user's profile
    const username = isOwnProfile ? null : lastPart;

    // Validate username for other profiles
    const loadingEl = document.getElementById('loading');
    if (!isOwnProfile && username === 'user') {
        loadingEl.innerHTML = '<div class="error-message">No user specified</div>';
        return;
    }

    // Elements
    const profileHeader = document.getElementById('profile-header');
    const profileContent = document.getElementById('profile-content');
    const usernameEl = document.getElementById('username');
    const bioEl = document.getElementById('bio');
    const profilePicEl = document.getElementById('profile-pic');
    const followersEl = document.getElementById('followers-count');
    const followingEl = document.getElementById('following-count');
    const postsCountEl = document.getElementById('posts-count');
    const actionButton = document.getElementById('action-button');
    const editBtn = document.getElementById('edit-profile-button');
    const modal = document.getElementById('edit-profile-modal');
    const closeBtn = document.querySelector('.close');
    const saveBtn = document.getElementById('save-changes');
    const editUsername = document.getElementById('edit-username');
    const editBio = document.getElementById('edit-bio');
    const editPic = document.getElementById('edit-pic');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Load profile
    async function loadProfile() {
        try {
            let res, data;

            if (isOwnProfile) {
                res = await fetch('/api/profile', { credentials: 'include' });
                if (res.status === 401) { window.location.href = '/login.html'; return; }
                if (!res.ok) throw new Error('Failed to load profile');
                data = await res.json();
                if (editBtn) editBtn.style.display = 'block';
                if (actionButton) actionButton.style.display = 'none';
            } else {
                res = await fetch(`/api/users/username/${username}`, { credentials: 'include' });
                if (res.status === 401) { window.location.href = '/login.html'; return; }
                if (res.status === 404) {
                    if (loadingEl) loadingEl.innerHTML = '<div class="error-message">User not found</div>';
                    return;
                }
                if (!res.ok) throw new Error('Failed to load profile');
                data = await res.json();
                window.currentProfileUserId = data.userID;

                if (editBtn) editBtn.style.display = 'none';
                if (actionButton) {
                    actionButton.style.display = 'block';
                    if (data.is_following) {
                        actionButton.textContent = 'Following';
                        actionButton.classList.add('following');
                    } else {
                        actionButton.textContent = 'Follow';
                        actionButton.classList.remove('following');
                    }
                }
            }

            // Update UI
            usernameEl.textContent = data.username || 'User';
            bioEl.textContent = data.bio || (isOwnProfile ? '' : 'No bio yet');
            profilePicEl.src = data.profile_pic || '/uploads/profiles/default.png';

            if (isOwnProfile) {
                followersEl.textContent = `${data.followers || 0} followers`;
                followingEl.textContent = `${data.following || 0} following`;
                if (postsCountEl) postsCountEl.textContent = data.posts_count || 0;
                window.currentProfileUserId = data.userID;
            } else {
                followersEl.textContent = data.followers || 0;
                followingEl.textContent = data.following || 0;
                if (postsCountEl) postsCountEl.textContent = data.posts_count || 0;
            }

            if (loadingEl) loadingEl.style.display = 'none';
            if (profileHeader) profileHeader.style.display = 'flex';
            if (profileContent) profileContent.style.display = 'block';

            loadUserPosts();
            loadUserEvents();

        } catch (err) {
            console.error('Failed to load profile:', err);
            if (loadingEl) loadingEl.innerHTML = '<div class="error-message">Failed to load profile</div>';
            else alert('Failed to load profile. Please try again.');
        }
    }

    // Follow/unfollow
    if (actionButton && !isOwnProfile) {
        actionButton.addEventListener('click', async () => {
            try {
                const isFollowing = actionButton.classList.contains('following');
                const endpoint = isFollowing ? 'unfollow' : 'follow';
                const res = await fetch(`/api/users/${window.currentProfileUserId}/${endpoint}`, {
                    method: 'POST',
                    credentials: 'include'
                });
                if (res.status === 401) { window.location.href = '/login.html'; return; }
                if (!res.ok) throw new Error('Failed to update follow status');
                const data = await res.json();
                if (isFollowing) {
                    actionButton.textContent = 'Follow';
                    actionButton.classList.remove('following');
                } else {
                    actionButton.textContent = 'Following';
                    actionButton.classList.add('following');
                }
                followersEl.textContent = data.followers;
            } catch (err) {
                console.error('Failed to update follow status:', err);
                alert('Failed to update follow status');
            }
        });
    }

    // Load user posts
    async function loadUserPosts() {
        try {
            const res = await fetch(`/api/users/${window.currentProfileUserId}/posts`, { credentials: 'include' });
            if (!res.ok) return;

            const posts = await res.json();
            const postsList = document.getElementById('posts-list');
            if (!postsList) return;

            if (posts.length === 0) {
                postsList.innerHTML = '<p class="no-content">No posts yet</p>';
                if (postsCountEl) postsCountEl.textContent = '0 posts';
                return;
            }

            postsList.className = 'feed';
            postsList.innerHTML = '';
            let postCount = 0;

            for (const post of posts) {
                postCount++;
                const createdAt = post.created_at ? getTimeAgo(new Date(post.created_at)) : 'just now';
                const isLiked = post.is_liked ? true : false;
                const replies = post.replies || [];
                const profilePic = post.profile_pic || '/uploads/profiles/default.png';
                const username = post.username || 'User';

                const postDiv = document.createElement('div');
                postDiv.className = 'post';
                postDiv.dataset.postId = post.id;

                postDiv.innerHTML = `
                    <div class="post-header">
                        <div class="user-avatar">
                            <img src="${profilePic}" alt="${username}">
                        </div>
                        <div class="post-info">
                            <div class="post-user">
                                <span class="username">${username}</span>
                                <span class="post-time">· ${createdAt}</span>
                            </div>
                        </div>
                    </div>
                    <div class="post-content">${escapeHtml(post.content)}</div>
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="like">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                            <span>${post.like_count || 'Like'}</span>
                        </button>
                        <button class="action-btn" data-action="reply">
                            <i class="far fa-comment"></i>
                            <span>${replies.length > 0 ? replies.length : 'Reply'}</span>
                        </button>
                    </div>
                    ${replies.length > 0 ? `
                    <div class="replies-section">
                        ${replies.map(reply => `
                        <div class="reply">
                            <div class="reply-header">
                                <span class="reply-username">${escapeHtml(reply.username)}</span>
                                <span class="reply-time">· ${getTimeAgo(new Date(reply.created_at))}</span>
                            </div>
                            <div class="reply-content">${escapeHtml(reply.content)}</div>
                        </div>`).join('')}
                    </div>` : ''}
                `;

                postsList.appendChild(postDiv);

                // Attach event listeners
                const avatarEl = postDiv.querySelector('.user-avatar');
                const usernameElSpan = postDiv.querySelector('.username');
                avatarEl.addEventListener('click', () => viewProfile(username));
                usernameElSpan.addEventListener('click', () => viewProfile(username));

                const replyUsernameEls = postDiv.querySelectorAll('.reply-username');
                replyUsernameEls.forEach(el => {
                    const replyUsername = el.textContent;
                    el.addEventListener('click', () => viewProfile(replyUsername));
                });

                // Like/reply buttons
                const likeBtn = postDiv.querySelector('[data-action="like"]');
                const replyBtn = postDiv.querySelector('[data-action="reply"]');
                likeBtn.addEventListener('click', () => toggleLike(post.id, likeBtn));
                replyBtn.addEventListener('click', () => openReplyModal(post));
            }

            if (postsCountEl) postsCountEl.textContent = `${postCount} posts`;

        } catch (err) {
            console.error('Failed to load posts:', err);
            const postsList = document.getElementById('posts-list');
            if (postsList) postsList.innerHTML = '<p class="loading">Failed to load posts.</p>';
        }
    }

    // Load user events
    async function loadUserEvents() {
        try {
            const res = await fetch(`/api/users/${window.currentProfileUserId}/events`, { credentials: 'include' });
            if (!res.ok) return;
            const events = await res.json();
            const eventsList = document.getElementById('events-list');
            if (!eventsList) return;

            if (events.length === 0) {
                eventsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">No events yet</p>';
                return;
            }

            eventsList.innerHTML = events.map(event => `
                <div class="card">
                    <div class="card-badge event">Event</div>
                    <h2>${event.title || 'Untitled Event'}</h2>
                    <div class="card-meta">
                        <i class="fa fa-calendar"></i> ${event.date || 'TBA'} <br>
                        <i class="fa fa-map-marker"></i> ${event.location || 'Location TBA'}
                    </div>
                    <div class="card-description">${event.description || ''}</div>
                    <div class="event-footer">
                        <span class="rsvp-count"><i class="fa fa-users"></i> ${event.rsvp_count || 0} going</span>
                        <button class="rsvp-btn" onclick="rsvpEvent(${event.id})">RSVP</button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Failed to load events:', err);
        }
    }

    window.rsvpEvent = async function(eventId) {
        try {
            const res = await fetch(`/api/events/${eventId}/rsvp`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.status === 401) { window.location.href = '/login.html'; return; }
            if (!res.ok) throw new Error('Failed to RSVP');
            alert('RSVP successful!');
            loadUserEvents();
        } catch (err) {
            console.error('Failed to RSVP:', err);
            alert('Failed to RSVP to event');
        }
    };

    // Edit profile modal (own profile)
    if (isOwnProfile && editBtn && modal) {
        editBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            editUsername.value = usernameEl.textContent.trim();
            editBio.value = bioEl.textContent.trim();
        });

        if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const formData = new FormData();
                formData.append('username', editUsername.value.trim());
                formData.append('bio', editBio.value.trim());
                if (editPic.files && editPic.files[0]) formData.append('profile_pic', editPic.files[0]);

                try {
                    const res = await fetch('/api/profile/update', { method: 'POST', credentials: 'include', body: formData });
                    if (res.status === 401) { window.location.href = '/login.html'; return; }
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Failed to update');

                    usernameEl.textContent = editUsername.value.trim();
                    bioEl.textContent = editBio.value.trim();
                    if (result.profile_pic) profilePicEl.src = result.profile_pic;
                    modal.style.display = 'none';

                } catch (err) {
                    console.error('Failed to update profile:', err);
                    alert('Failed to update profile');
                }
            });
        }
    }

    // Load profile on page load
    loadProfile();
});
