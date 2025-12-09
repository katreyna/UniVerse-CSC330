document.addEventListener("DOMContentLoaded", () => {
    // Get username from URL path
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[pathParts.length - 1];
    
    // Determine if this is the current user's own profile
    const isOwnProfile = !username || username === 'profile' || username === '';

    if (!isOwnProfile && username === 'user') {
        document.getElementById('loading').innerHTML = '<div class="error-message">No user specified</div>';
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
                    if (loadingEl) loadingEl.innerHTML = '<div class="error-message">User not found</div>';
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
            
            if (isOwnProfile) {
                followersEl.textContent = `${data.followers || 0} followers`;
                followingEl.textContent = `${data.following || 0} following`;
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

            // Load posts and events for other profiles
            if (!isOwnProfile) {
                loadUserPosts();
                loadUserEvents();
            }

        } catch (err) {
            console.error('Failed to load profile:', err);
            if (loadingEl) {
                loadingEl.innerHTML = '<div class="error-message">Failed to load profile</div>';
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

    // Load user posts (for other profiles)
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

            postsList.innerHTML = posts.map(post => `
                <div class="card">
                    <div class="card-badge">Post</div>
                    <h2>${post.title || 'Untitled'}</h2>
                    <div class="card-description">${post.content || ''}</div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Failed to load posts:', err);
        }
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
