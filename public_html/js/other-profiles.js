// get username from URL path
        const pathParts = window.location.pathname.split('/');
        const username = pathParts[pathParts.length - 1];

        if (!username || username === 'user' || username === '') {
            document.getElementById('loading').innerHTML = '<div class="error-message">No user specified</div>';
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

        // Load user profile
        async function loadUserProfile() {
            try {
                const res = await fetch(`/api/users/username/${username}`, { 
                    credentials: 'include' 
                });

                if (res.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }

                if (res.status === 404) {
                    loadingEl.innerHTML = '<div class="error-message">User not found</div>';
                    return;
                }

                if (!res.ok) {
                    throw new Error('Failed to load profile');
                }

                const data = await res.json();
                
                // Store the actual user ID for API calls
                window.currentProfileUserId = data.userID;
                
                // Update UI
                usernameEl.textContent = data.username || 'User';
                bioEl.textContent = data.bio || 'No bio yet';
                profilePicEl.src = data.profile_pic || '/uploads/profiles/default.png';
                followersEl.textContent = data.followers || 0;
                followingEl.textContent = data.following || 0;
                postsCountEl.textContent = data.posts_count || 0;

                // Update follow button
                if (data.is_following) {
                    actionButton.textContent = 'Following';
                    actionButton.classList.add('following');
                } else {
                    actionButton.textContent = 'Follow';
                    actionButton.classList.remove('following');
                }

                // Show profile
                loadingEl.style.display = 'none';
                profileHeader.style.display = 'flex';
                profileContent.style.display = 'block';

                // Load posts and events
                loadUserPosts();
                loadUserEvents();

            } catch (err) {
                console.error('Failed to load profile:', err);
                loadingEl.innerHTML = '<div class="error-message">Failed to load profile</div>';
            }
        }

        // Follow/Unfollow
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

                // Toggle button state
                if (isFollowing) {
                    actionButton.textContent = 'Follow';
                    actionButton.classList.remove('following');
                    followersEl.textContent = parseInt(followersEl.textContent) - 1;
                } else {
                    actionButton.textContent = 'Following';
                    actionButton.classList.add('following');
                    followersEl.textContent = parseInt(followersEl.textContent) + 1;
                }

            } catch (err) {
                console.error('Failed to update follow status:', err);
                alert('Failed to update follow status');
            }
        });

        // Load user posts
        async function loadUserPosts() {
            try {
                const res = await fetch(`/api/users/${window.currentProfileUserId}/posts`, { 
                    credentials: 'include' 
                });

                if (!res.ok) return;

                const posts = await res.json();
                const postsList = document.getElementById('posts-list');

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

        // Load user events
        async function loadUserEvents() {
            try {
                const res = await fetch(`/api/users/${window.currentProfileUserId}/events`, { 
                    credentials: 'include' 
                });

                if (!res.ok) return;

                const events = await res.json();
                const eventsList = document.getElementById('events-list');

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

        // RSVP to event
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

        // Load profile on page load
        if (username && username !== 'user' && username !== '') {
            loadUserProfile();
        }
