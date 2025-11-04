// Mock data for Sprint 1 demo
const mockPosts = [
  {
    id: 1,
    author: "SCSU Computer Science Club",
    title: "Alumni Post Grad Guidance",
    description: "Speak and Network with SCSU Alumni who graduated and are working in the field!",
    createdAt: "2025-10-31T14:20:00Z"
  },
  {
    id: 2,
    author: "Tiago Freitas",
    title: "Study group for MAT178",
    description: "Library 2nd floor from 12:00-2:00pm",
    createdAt: "2025-11-02T19:10:00Z"
  },
  {
    id: 3,
    author: "Campus Activities",
    title: "Free Pizza Today",
    description: "Outside the Library",
    createdAt: "2025-11-03T12:00:00Z"
  }
];

function loadFeed() {
  const container = document.getElementById("feed");
  
  container.innerHTML = "";
  
  if (mockPosts.length === 0) {
    container.innerHTML = '<p class="no-content">No posts yet. Be the first to share!</p>';
    return;
  }
  
  mockPosts.forEach(post => {
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

document.addEventListener("DOMContentLoaded", loadFeed);