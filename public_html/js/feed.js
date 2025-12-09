// Get current user info
let currentUser = null;
let currentReplyingTo = null;

async function getCurrentUser() {
  try {
    const res = await fetch('/api/session', { credentials: 'include' });
    const data = await res.json();

    if (data.loggedIn) {
      currentUser = data.user;

      const avatar = document.getElementById('currentUserAvatar');
      if (avatar) {
        const profilePic = data.user.profile_pic || '/uploads/profiles/default.png';
        avatar.innerHTML = `<img src="${profilePic}" alt="${currentUser.username}" />`;
      }
    } else {
      window.location.href = '/login.html';
    }
  } catch (err) {
    console.error('Failed to get current user:', err);
    window.location.href = '/login.html';
  }
}

// Create post form toggle
const createPostTrigger = document.getElementById('createPostTrigger');
const createPostForm = document.getElementById('createPostForm');
const cancelPostBtn = document.getElementById('cancelPostBtn');
const submitPostBtn = document.getElementById('submitPostBtn');
const postContent = document.getElementById('postContent');
const formMessage = document.getElementById('formMessage');

createPostTrigger.addEventListener('click', () => {
  createPostForm.classList.add('active');
  postContent.focus();
});

cancelPostBtn.addEventListener('click', () => {
  createPostForm.classList.remove('active');
  postContent.value = '';
  formMessage.innerHTML = '';
});

// Submit post
submitPostBtn.addEventListener('click', async () => {
  const content = postContent.value.trim();

  if (!content) {
    formMessage.innerHTML = '<div class="message error">Please write something!</div>';
    return;
  }

  submitPostBtn.disabled = true;
  submitPostBtn.textContent = 'Posting...';

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });

    const data = await res.json();

    if (data.success) {
      formMessage.innerHTML = '<div class="message success">Posted!</div>';
      postContent.value = '';
      setTimeout(() => {
        createPostForm.classList.remove('active');
        formMessage.innerHTML = '';
        loadPosts();
      }, 1000);
    } else {
      formMessage.innerHTML = `<div class="message error">${data.message}</div>`;
    }
  } catch (err) {
    console.error('Failed to create post:', err);
    formMessage.innerHTML = '<div class="message error">Failed to post. Try again.</div>';
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = 'Post';
  }
});

// Load posts
async function loadPosts() {
  const feedEl = document.getElementById('feed');

  try {
    const res = await fetch('/api/posts', { credentials: 'include' });
    
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }

    const posts = await res.json();

    if (posts.length === 0) {
      feedEl.innerHTML = '<p class="no-content">No posts yet. Be the first to post!</p>';
      return;
    }

    feedEl.innerHTML = '';
    
    for (const post of posts) {
      const postEl = await createPostElement(post);
      feedEl.appendChild(postEl);
    }

  } catch (err) {
    console.error('Failed to load posts:', err);
    feedEl.innerHTML = '<p class="loading">Failed to load posts. Please refresh.</p>';
  }
}

// Create post element
async function createPostElement(post) {
  const postDiv = document.createElement('div');
  postDiv.className = 'post';
  postDiv.dataset.postId = post.id || post.postID;

  const timeAgo = getTimeAgo(new Date(post.created));
  const userInitial = post.username ? post.username.charAt(0).toUpperCase() : 'U';
  const username = post.username || 'Unknown User';
  
  // Check if user liked this post
  const isLiked = await checkIfLiked(post.id || post.postID);
  const likeCount = await getLikeCount(post.id || post.postID);
  
  // Get replies
  const replies = await getReplies(post.id || post.postID);

  postDiv.innerHTML = `
    <div class="post-header">
      <div class="user-avatar" onclick="viewProfile('${username}')">${userInitial}</div>
      <div class="post-info">
        <div class="post-user">
          <span class="username" onclick="viewProfile('${username}')">${escapeHtml(username)}</span>
          <span class="post-time">· ${timeAgo}</span>
        </div>
      </div>
    </div>
    <div class="post-content">${escapeHtml(post.content)}</div>
    <div class="post-actions">
      <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="like">
        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
        <span>${likeCount > 0 ? likeCount : 'Like'}</span>
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
              <span class="reply-username" onclick="viewProfile('${reply.username}')">${escapeHtml(reply.username)}</span>
              <span class="reply-time">· ${getTimeAgo(new Date(reply.created))}</span>
            </div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  // Add event listeners
  const likeBtn = postDiv.querySelector('[data-action="like"]');
  const replyBtn = postDiv.querySelector('[data-action="reply"]');

  likeBtn.addEventListener('click', () => toggleLike(post.id || post.postID, likeBtn));
  replyBtn.addEventListener('click', () => openReplyModal(post));

  return postDiv;
}

// Like functionality
async function toggleLike(postId, btn) {
  try {
    const isLiked = btn.classList.contains('liked');
    const endpoint = isLiked ? 'unlike' : 'like';

    const res = await fetch(`/api/posts/${postId}/${endpoint}`, {
      method: 'POST',
      credentials: 'include'
    });

    if (res.ok) {
      const data = await res.json();
      
      // Update UI
      if (isLiked) {
        btn.classList.remove('liked');
        btn.querySelector('i').classList.remove('fas');
        btn.querySelector('i').classList.add('far');
      } else {
        btn.classList.add('liked');
        btn.querySelector('i').classList.remove('far');
        btn.querySelector('i').classList.add('fas');
      }
      
      const count = data.likeCount || 0;
      btn.querySelector('span').textContent = count > 0 ? count : (isLiked ? 'Like' : 'Like');
    }
  } catch (err) {
    console.error('Failed to toggle like:', err);
  }
}

// Check if user liked post
async function checkIfLiked(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/liked`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.liked;
    }
  } catch (err) {
    console.error('Failed to check like status:', err);
  }
  return false;
}

// Get like count
async function getLikeCount(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/likes`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
  } catch (err) {
    console.error('Failed to get like count:', err);
  }
  return 0;
}

// Get replies
async function getReplies(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/replies`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data || [];
    }
  } catch (err) {
    console.error('Failed to get replies:', err);
  }
  return [];
}

// Reply modal
const replyModal = document.getElementById('replyModal');
const closeModal = document.querySelector('.close-modal');
const replyContent = document.getElementById('replyContent');
const submitReply = document.getElementById('submitReply');
const replyingTo = document.getElementById('replyingTo');

function openReplyModal(post) {
  currentReplyingTo = post;
  replyingTo.textContent = `Replying to @${post.username}: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`;
  replyModal.classList.add('active');
  replyContent.focus();
}

closeModal.addEventListener('click', () => {
  replyModal.classList.remove('active');
  replyContent.value = '';
  currentReplyingTo = null;
});

replyModal.addEventListener('click', (e) => {
  if (e.target === replyModal) {
    replyModal.classList.remove('active');
    replyContent.value = '';
    currentReplyingTo = null;
  }
});

submitReply.addEventListener('click', async () => {
  const content = replyContent.value.trim();
  
  if (!content) {
    alert('Please write a reply!');
    return;
  }

  if (!currentReplyingTo) return;

  submitReply.disabled = true;
  submitReply.textContent = 'Replying...';

  try {
    const res = await fetch(`/api/posts/${currentReplyingTo.id || currentReplyingTo.postID}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });

    if (res.ok) {
      replyModal.classList.remove('active');
      replyContent.value = '';
      currentReplyingTo = null;
      loadPosts();
    } else {
      alert('Failed to post reply');
    }
  } catch (err) {
    console.error('Failed to post reply:', err);
    alert('Failed to post reply');
  } finally {
    submitReply.disabled = false;
    submitReply.textContent = 'Reply';
  }
});

// Helper functions
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function viewProfile(username) {
  window.location.href = `/user/${username}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  getCurrentUser();
  loadPosts();
});
