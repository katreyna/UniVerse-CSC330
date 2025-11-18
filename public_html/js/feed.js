// feed.js

// Dynamically load posts from server
async function loadFeed() {
  const container = document.getElementById("feed");
  container.innerHTML = '<p class="loading">Loading posts...</p>';

  try {
    const resp = await fetch("/api/posts"); // server endpoint
    if (!resp.ok) throw new Error("Network response was not ok");

    const posts = await resp.json();
    container.innerHTML = "";

    if (!posts.length) {
      container.innerHTML = '<p class="no-content">No posts yet. Be the first to share!</p>';
      return;
    }

    posts.forEach(post => {
      const card = createPostCard(post);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load feed:", err);
    container.innerHTML = '<p class="error">Could not load posts. Try again later.</p>';
  }
}

// Create a post card
function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "card post-card";

  const date = new Date(post.createdAt);
  const timeAgo = getTimeAgo(date);

  // Ensure likes/comments exist
  post.likes = post.likes || 0;
  post.comments = post.comments || [];

  card.innerHTML = `
    <div class="card-badge">Post</div>
    <h2>${escapeHtml(post.title)}</h2>
    <p class="card-meta">by ${escapeHtml(post.author)} • ${timeAgo}</p>
    <p class="card-description">${escapeHtml(post.description)}</p>
    <div class="post-actions">
      <button class="like-btn">👍 Like (<span class="like-count">${post.likes}</span>)</button>
      <button class="comment-btn">💬 Comment (${post.comments.length})</button>
      <div class="comment-section">
        <input type="text" class="comment-input" placeholder="Write a comment...">
        <button class="submit-comment">Post</button>
        <div class="comments-list"></div>
      </div>
    </div>
  `;

  // Like button functionality
  const likeBtn = card.querySelector(".like-btn");
  const likeCount = card.querySelector(".like-count");

  likeBtn.addEventListener("click", async () => {
    post.likes += 1;
    likeCount.textContent = post.likes;

    // Send like to server (optional)
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch (err) {
      console.error("Failed to like post on server", err);
    }
  });

  // Toggle comment section
  const commentBtn = card.querySelector(".comment-btn");
  const commentSection = card.querySelector(".comment-section");
  commentBtn.addEventListener("click", () => {
    commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
  });

  // Submit comment
  const submitComment = card.querySelector(".submit-comment");
  const commentInput = card.querySelector(".comment-input");
  const commentsList = card.querySelector(".comments-list");

  submitComment.addEventListener("click", async () => {
    const commentText = commentInput.value.trim();
    if (!commentText) return;

    post.comments.push(commentText);

    const commentEl = document.createElement("p");
    commentEl.className = "comment";
    commentEl.textContent = commentText;
    commentsList.appendChild(commentEl);

    commentInput.value = "";
    commentBtn.textContent = `💬 Comment (${post.comments.length})`;

    // Send comment to server (optional)
    try {
      await fetch(`/api/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText })
      });
    } catch (err) {
      console.error("Failed to post comment on server", err);
    }
  });

  // Load existing comments (if any)
  post.comments.forEach(c => {
    const commentEl = document.createElement("p");
    commentEl.className = "comment";
    commentEl.textContent = c;
    commentsList.appendChild(commentEl);
  });

  return card;
}

// Helper: calculate "time ago"
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Helper: escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener("DOMContentLoaded", loadFeed);
