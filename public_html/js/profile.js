document.addEventListener("DOMContentLoaded", () => {
    // Get the last part of the URL path
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    // Determine if this is the current user's own profile
    // Own profile if: empty, 'profile', 'profile.html', or ends with .html
    const isOwnProfile = !lastPart || 
                         lastPart === 'profile' || 
                         lastPart === 'profile.html' || 
                         lastPart.endsWith('.html') ||
                         lastPart === '';
    
    // Only set username if it's actually another user's profile
    const username = isOwnProfile ? null : lastPart;

    // Validate username for other profiles
    if (!isOwnProfile && username === 'user') {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.textContent = 'No user specified';
            loadingEl.style.color = '#ff6b6b';
        }
        return;
    }

    // Elements
    const loadingEl = document.getElementById('loading');
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

    // Helper function to format time ago
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + 'y';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + 'mo';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + 'd';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + 'h';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + 'm';
        
        return Math.floor(seconds) + 's';
    }

    // Load profile based on whether it's own profile or another user's
    async function loadProfile() {
        try {
            let res, data;

            if (isOwnProfile) {
                // Load own profile
                res = await fetch('/api/profile', { credentials: 'include' });
                
                if (res.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                
                if (!res.ok) throw new Error('Failed to load profile');
                
                data = await res.json();
                
                // Show edit button, hide follow button
                if (editBtn) editBtn.style.display = 'block';
                if (actionButton) actionButton.style.display = 'none';
                
            } else {
                // Load another user's profile
                res = await fetch(`/api/users/username/${username}`, { 
                    credentials: 'include' 
                });

                if (res.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }

                if (res.status === 404) {
                    if (loadingEl) {
                        loadingEl.textContent = 'User not found';
                        loadingEl.style.color = '#ff6b6b';
                    }
                    return;
                }

                if (!res.ok) throw new Error('Failed to load profile');

                data = await res.json();
                
                // Store the actual user ID for API calls
                window.currentProfileUserId = data.userID;
                
                // Hide edit button, show follow button
                if (editBtn) editBtn.style.display = 'none';
                if (actionButton) {
                    actionButton.style.display = 'block';
                    
                    // Update follow button state
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
            
            // Check if the HTML already contains the text "followers"/"following"
            const hasFollowersText = followersEl.textContent.includes('followers');
            const hasFollowingText = followingEl.textContent.includes('following');
            const hasPostsText = postsCountEl && postsCountEl.textContent.includes('posts');
            
            if (isOwnProfile) {
                followersEl.textContent = hasFollowersText ? `${data.followers || 0} followers` : data.followers || 0;
                followingEl.textContent = hasFollowingText ? `${data.following || 0} following` : data.following || 0;
                if (postsCountEl) postsCountEl.textContent = hasPostsText ? `${data.posts_count || 0} posts` : data.posts_count || 0;
            } else {
                followersEl.textContent = data.followers || 0;
                followingEl.textContent = data.following || 0;
                if (postsCountEl) postsCountEl.textContent = data.posts_count || 0;
            }

            // Show profile
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            if (profileHeader) profileHeader.style.display = 'flex';
            if (profileContent) profileContent.style.display = 'block';

            // Load posts and events for all profiles (own and others)
            if (isOwnProfile) {
                // For own profile, use the user ID from the profile data
                window.currentProfileUserId = data.userID;
            }
            loadUserPosts();
            loadUserEvents();

        } catch (err) {
            console.error('Failed to load profile:', err);
            if (loadingEl) {
                loadingEl.textContent = 'Failed to load profile';
                loadingEl.style.color = '#ff6b6b';
            } else {
                alert('Failed to load profile. Please try again.');
            }
        }
    }

    // Follow/Unfollow button (only for other profiles)
    if (actionButton && !isOwnProfile) {
        actionButton.addEventListener('click', async () => {
            try {
                const isFollowing = actionButton.classList.contains('following');
                const endpoint = isFollowing ? 'unfollow' : 'follow';

                const res = await fetch(`/api/users/${window.currentProfileUserId}/${endpoint}`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (res.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }

                if (!res.ok) throw new Error('Failed to update follow status');

                const data = await res.json();

                // Update button state and followers count
                if (isFollowing) {
                    actionButton.textContent = 'Follow';
                    actionButton.classList.remove('following');
                } else {
                    actionButton.textContent = 'Following';
                    actionButton.classList.add('following');
                }

                // Update followers count from server
                followersEl.textContent = data.followers;

            } catch (err) {
                console.error('Failed to update follow status:', err);
                alert('Failed to update follow status');
            }
        });
    }

    // Load user posts (feed-style format)
    async function loadUserPosts() {
        try {
            const res = await fetch(`/api/users/${window.currentProfileUserId}/posts`, { 
                credentials: 'include' 
            });

            if (!res.ok) return;

            const posts = await res.json();
            const postsList = document.getElementById('posts-list');

            if (!postsList) return;

            if (posts.length === 0) {
                postsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">No posts yet</p>';
                return;
            }

            // Change the container class to feed-style
            postsList.className = 'feed';

            // Format posts like the feed
            postsList.innerHTML = posts.map(post => {
                const createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : 'Just now';
                const likeCount = post.like_count || 0;
                const replyCount = post.reply_count || 0;
                const isLiked = post.is_liked ? 'liked' : '';
                
                return `
                    <div class="post-card" data-post-id="${post.id}">
                        <div class="post-header">
                            <img src="${post.profile_pic || '/uploads/profiles/default.png'}" class="post-avatar" alt="${post.username}">
                            <div class="post-user-info">
                                <span class="post-username">${post.username || 'User'}</span>
                                <span class="post-time">${createdAt}</span>
                            </div>
                        </div>
                        <div class="post-content">${post.content || ''}</div>
                        <div class="post-actions">
                            <button class="action-btn like-btn ${isLiked}" data-post-id="${post.id}">
                                <i class="fa fa-heart"></i>
                                <span class="like-count">${likeCount}</span>
                            </button>
                            <button class="action-btn reply-btn" data-post-id="${post.id}">
                                <i class="fa fa-comment"></i>
                                <span class="reply-count">${replyCount}</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners for like and reply buttons
            attachPostEventListeners();

        } catch (err) {
            console.error('Failed to load posts:', err);
        }
    }

    // Attach event listeners to post action buttons
    function attachPostEventListeners() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const postId = btn.dataset.postId;
                const isLiked = btn.classList.contains('liked');
                
                try {
                    const endpoint = isLiked ? `/api/posts/${postId}/unlike` : `/api/posts/${postId}/like`;
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (res.status === 401) {
                        window.location.href = '/login.html';
                        return;
                    }

                    if (!res.ok) throw new Error('Failed to update like');

                    const data = await res.json();
                    
                    // Update UI
                    btn.classList.toggle('liked');
                    const likeCountEl = btn.querySelector('.like-count');
                    likeCountEl.textContent = data.like_count || 0;

                } catch (err) {
                    console.error('Failed to update like:', err);
                }
            });
        });

        // Reply buttons
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = btn.dataset.postId;
                // You can implement reply modal here if needed
                alert('Reply functionality - Post ID: ' + postId);
            });
        });
    }

    // Load user events (for other profiles)
    async function loadUserEvents() {
        try {
            const res = await fetch(`/api/users/${window.currentProfileUserId}/events`, { 
                credentials: 'include' 
            });

            if (!res.ok) return;

            const events = await res.json();
            const eventsList = document.getElementById('events-list');

            if (!eventsList) return;

            if (events.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.color = 'rgba(255,255,255,0.7)';
                emptyMsg.style.padding = '20px';
                emptyMsg.textContent = 'No events yet';
                eventsList.innerHTML = '';
                eventsList.appendChild(emptyMsg);
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

    // RSVP to event (for other profiles)
    window.rsvpEvent = async function(eventId) {
        try {
            const res = await fetch(`/api/events/${eventId}/rsvp`, {
                method: 'POST',
                credentials: 'include'
            });

            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }

            if (!res.ok) throw new Error('Failed to RSVP');

            alert('RSVP successful!');
            loadUserEvents();

        } catch (err) {
            console.error('Failed to RSVP:', err);
            alert('Failed to RSVP to event');
        }
    };

    // Edit profile modal (only for own profile)
    if (isOwnProfile && editBtn && modal) {
        editBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            editUsername.value = usernameEl.textContent.trim();
            editBio.value = bioEl.textContent.trim();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Save profile changes
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const formData = new FormData();
                formData.append('username', editUsername.value.trim());
                formData.append('bio', editBio.value.trim());
                if (editPic.files && editPic.files[0]) {
                    formData.append('profile_pic', editPic.files[0]);
                }

                try {
                    const res = await fetch('/api/profile/update', {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });

                    if (res.status === 401) {
                        window.location.href = '/login.html';
                        return;
                    }

                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Failed to update');

                    // Update UI with new info
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
