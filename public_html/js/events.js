// Mock data fallback
const mockEvents = [
  {
    id: 101,
    title: "Intramural Soccer Finals",
    event_time: "2025-11-20T19:00:00",
    location: "Moore Field",
    description: "Come cheer on the teams! Free admission for students.",
    rsvp_count: 0
  },
  {
    id: 102,
    title: "Career Fair",
    event_time: "2025-11-25T10:00:00",
    location: "Student Center",
    description: "Tech, finance, and healthcare companies recruiting.",
    rsvp_count: 0
  },
  {
    id: 103,
    title: "Fall Concert",
    event_time: "2025-11-28T20:00:00",
    location: "University Auditorium",
    description: "Featuring local bands and student performers!",
    rsvp_count: 0
  }
];

// Load events from database or fallback to mock data
async function loadEvents() {
  const container = document.getElementById("events");
  container.innerHTML = '<p class="loading">Loading events...</p>';

  try {
    // Try to fetch from database
    const response = await fetch("/api/events");
    
    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const events = await response.json();
    
    // Server already has mock data fallback, so just display what we get
    console.log("✅ Loaded events:", events.length);
    displayEvents(events);
  } catch (error) {
    // If fetch fails completely, use local mock data
    console.log("⚠️ Using local mock data:", error);
    displayEvents(mockEvents);
  }
}

function displayEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";
  
  if (events.length === 0) {
    container.innerHTML = '<p class="no-content">No upcoming events. Check back soon!</p>';
    return;
  }
  
  events.forEach(event => {
    const card = createEventCard(event);
    container.appendChild(card);
  });
}

function createEventCard(event) {
  const card = document.createElement("article");
  card.className = "card event-card";
  
  const eventDate = new Date(event.event_time);
  const formattedDate = eventDate.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  
  card.innerHTML = `
    <div class="card-badge event">Event</div>
    <h2>${escapeHtml(event.title)}</h2>
    <p class="card-meta">
      <i class="fa fa-calendar"></i> ${formattedDate} at ${formattedTime}<br>
      <i class="fa fa-map-marker"></i> ${escapeHtml(event.location)}
    </p>
    <p class="card-description">${escapeHtml(event.description)}</p>
    ${event.rsvp_count !== undefined ? `<p class="card-meta"><i class="fa fa-users"></i> ${event.rsvp_count} attending</p>` : ''}
  `;
  
  return card;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Create Event functionality
document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  
  const createEventBtn = document.getElementById("createEventBtn");
  const createEventForm = document.getElementById("createEventForm");
  const cancelEventBtn = document.getElementById("cancelEventBtn");
  const submitEventBtn = document.getElementById("submitEventBtn");
  const formMessage = document.getElementById("formMessage");
  
  // Show create form
  createEventBtn.addEventListener("click", () => {
    createEventForm.classList.add("active");
    formMessage.innerHTML = "";
  });
  
  // Hide create form
  cancelEventBtn.addEventListener("click", () => {
    createEventForm.classList.remove("active");
    clearForm();
    formMessage.innerHTML = "";
  });
  
  // Submit new event
  submitEventBtn.addEventListener("click", async () => {
    const title = document.getElementById("eventTitle").value.trim();
    const event_time = document.getElementById("eventDateTime").value;
    const location = document.getElementById("eventLocation").value.trim();
    const description = document.getElementById("eventDescription").value.trim();
    
    // Validation
    if (!title || !event_time || !location) {
      showMessage("Please fill in all required fields", "error");
      return;
    }
    
    // Disable button while submitting
    submitEventBtn.disabled = true;
    submitEventBtn.textContent = "Creating...";
    
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ 
          title, 
          event_time, 
          location, 
          description 
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage("Event created successfully!", "success");
        clearForm();
        
        // Reload events after 1 second
        setTimeout(() => {
          createEventForm.classList.remove("active");
          loadEvents();
        }, 1000);
      } else {
        showMessage(data.message || "Failed to create event. Please login first.", "error");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      showMessage("Error creating event. Please try again.", "error");
    } finally {
      submitEventBtn.disabled = false;
      submitEventBtn.textContent = "Create Event";
    }
  });
  
  function clearForm() {
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDateTime").value = "";
    document.getElementById("eventLocation").value = "";
    document.getElementById("eventDescription").value = "";
  }
  
  function showMessage(message, type) {
    formMessage.innerHTML = `<div class="message ${type}">${message}</div>`;
  }
});