// Mock data fallback
const mockPosts = [
  {
    id: 1,
    author: "SCSU Computer Science Club",
    title: "Alumni Post Grad Guidance",
    description: "Speak and Network with SCSU Alumni who graduated and are working in the field!",
    createdAt: "2025-10-31T14:20:00Z",
    likes: 0,
    comments: []
  },
  {
    id: 2,
    author: "Tiago Freitas",
    title: "Study group for MAT178",
    description: "Library 2nd floor from 12:00-2:00pm",
    createdAt: "2025-11-02T19:10:00Z",
    likes: 0,
    comments: []
  },
  {
    id: 3,
    author: "Campus Activities",
    title: "Free Pizza Today",
    description: "Outside the Library",
    createdAt: "2025-11-03T12:00:00Z",
    likes: 0,
    comments: []
  }
];

// Load feed from database or fallback to mock data
async function loadFeed() {
  const container = document.getElementById("feed");
  container.innerHTML = '<p class="loading">Loading posts...</p>';

  try {
    // Try to fetch from database
    const response = await fetch("/api/posts");
    
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await response.json();
    
    // If database returns posts, use them
    if (posts && posts.length > 0) {
      console.log("✅ Loaded posts from database:", posts.length);
      displayPosts(posts);
    } else {
      // If database is empty, use mock data
      console.log("⚠️ Database empty, using mock data");
      displayPosts(mockPosts);
    }
  } catch (error) {
    // If database fails, use mock data
    console.log("⚠️ Database unavailable, using mock data:", error);
    displayPosts(mockPosts);
  }
}

function displayPosts(posts) {
  const container = document.getElementById("feed");
  container.innerHTML = "";
  
  if (posts.length === 0) {
    container.innerHTML = '<p class="no-content">No posts yet. Be the first to share!</p>';
    return;
  }
  
  posts.forEach(post => {
    const card = createPostCard(post);
    container.appendChild(card);
  });
}

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "card";
  
  const date = new Date(post.createdAt);
  const timeAgo = getTimeAgo(date);
  
  card.innerHTML = `
    <div class="card-badge">Post</div>
    <h2>${escapeHtml(post.title)}</h2>
    <p class="card-meta">by ${escapeHtml(post.author)} • ${timeAgo}</p>
    <p class="card-description">${escapeHtml(post.description)}</p>
  `;
  
  return card;
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Create Post functionality
document.addEventListener("DOMContentLoaded", () => {
  loadFeed();
  
  const createPostBtn = document.getElementById("createPostBtn");
  const createPostForm = document.getElementById("createPostForm");
  const cancelPostBtn = document.getElementById("cancelPostBtn");
  const submitPostBtn = document.getElementById("submitPostBtn");
  const formMessage = document.getElementById("formMessage");
  
  // Show create form
  createPostBtn.addEventListener("click", () => {
    createPostForm.classList.add("active");
    formMessage.innerHTML = "";
  });
  
  // Hide create form
  cancelPostBtn.addEventListener("click", () => {
    createPostForm.classList.remove("active");
    document.getElementById("postTitle").value = "";
    document.getElementById("postDescription").value = "";
    formMessage.innerHTML = "";
  });
  
  // Submit new post
  submitPostBtn.addEventListener("click", async () => {
    const title = document.getElementById("postTitle").value.trim();
    const description = document.getElementById("postDescription").value.trim();
    
    // Validation
    if (!title || !description) {
      showMessage("Please fill in all fields", "error");
      return;
    }
    
    // Disable button while submitting
    submitPostBtn.disabled = true;
    submitPostBtn.textContent = "Posting...";
    
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ title, description })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage("Post created successfully!", "success");
        
        // Clear form
        document.getElementById("postTitle").value = "";
        document.getElementById("postDescription").value = "";
        
        // Reload feed after 1 second
        setTimeout(() => {
          createPostForm.classList.remove("active");
          loadFeed();
        }, 1000);
      } else {
        showMessage(data.message || "Failed to create post. Please login first.", "error");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      showMessage("Error creating post. Please try again.", "error");
    } finally {
      submitPostBtn.disabled = false;
      submitPostBtn.textContent = "Post";
    }
  });
  
  function showMessage(message, type) {
    formMessage.innerHTML = `<div class="message ${type}">${message}</div>`;
  }
});