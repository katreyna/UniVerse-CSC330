// Global state
let currentUser = null;

// Check if user is logged in when page loads
async function checkLoginStatus() {
  try {
    const response = await fetch('/api/session');
    const data = await response.json();
    if (data.loggedIn) {
      currentUser = data.user;
    }
  } catch (error) {
    console.error('Error checking login status:', error);
  }
}

// Load events from API
async function loadEvents() {
  const container = document.getElementById("events");
  container.innerHTML = '<p class="loading">Loading events...</p>';
  
  try {
    const response = await fetch('/api/events');
    
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    
    const events = await response.json();
    console.log("Events loaded:", events);
    container.innerHTML = "";
    
    if (events.length === 0) {
      container.innerHTML = '<p class="no-content">No upcoming events. Check back soon!</p>';
      return;
    }
    
    events.forEach(event => {
      const card = createEventCard(event);
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading events:', error);
    container.innerHTML = '<p class="error">Failed to load events. Please try again later.</p>';
  }
}

function createEventCard(event) {
  const card = document.createElement("article");
  card.className = "card event-card";
  
  // Parse the event_time datetime
  const eventDateTime = new Date(event.event_time);
  const formattedDate = eventDateTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const formattedTime = eventDateTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  
  // RSVP count display
  const rsvpCount = event.rsvp_count || 0;
  const rsvpText = rsvpCount === 1 ? '1 person going' : `${rsvpCount} people going`;
  
  card.innerHTML = `
    <div class="card-badge event">Event</div>
    <h2>${escapeHtml(event.title)}</h2>
    <p class="card-meta">
      <i class="fa fa-calendar"></i> ${formattedDate} at ${formattedTime}<br>
      <i class="fa fa-map-marker"></i> ${escapeHtml(event.location)}
    </p>
    <p class="card-description">${escapeHtml(event.description)}</p>
    <div class="event-footer">
      <span class="rsvp-count">
        <i class="fa fa-users"></i> ${rsvpText}
      </span>
      <button class="rsvp-btn" data-event-id="${event.id}">
        ${currentUser ? 'RSVP' : 'Login to RSVP'}
      </button>
    </div>
  `;
  
  // Add RSVP button click handler
  const rsvpBtn = card.querySelector('.rsvp-btn');
  rsvpBtn.addEventListener('click', () => handleRSVP(event.id, rsvpBtn));
  
  return card;
}

async function handleRSVP(eventId, button) {
  // Check if user is logged in
  if (!currentUser) {
    alert('Please log in to RSVP to events');
    window.location.href = '/login';
    return;
  }
  
  // Disable button while processing
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Processing...';
  
  try {
    const response = await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update button
      button.textContent = '✓ RSVP\'d';
      button.classList.add('rsvped');
      button.disabled = true;
      
      // Update count
      const countElement = button.parentElement.querySelector('.rsvp-count');
      const count = data.rsvp_count;
      const countText = count === 1 ? '1 person going' : `${count} people going`;
      countElement.innerHTML = `<i class="fa fa-users"></i> ${countText}`;
      
      // Show success message
      showNotification('RSVP successful!', 'success');
    } else {
      alert(data.message || 'RSVP failed');
      button.textContent = originalText;
      button.disabled = false;
    }
  } catch (error) {
    console.error('RSVP error:', error);
    alert('Failed to RSVP. Please try again.');
    button.textContent = originalText;
    button.disabled = false;
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus();
  await loadEvents();
});