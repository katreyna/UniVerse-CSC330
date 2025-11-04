// Mock data for Sprint 1 demo
const mockEvents = [
  {
    id: 101,
    title: "Intramural Soccer Finals",
    date: "2025-11-06",
    time: "7:00 PM",
    location: "Moore Field",
    description: "Come cheer on the teams! Free admission for students."
  },
  {
    id: 102,
    title: "Career Fair",
    date: "2025-11-12",
    time: "10:00 AM - 3:00 PM",
    location: "Student Center",
    description: "Tech, finance, and healthcare companies will be recruiting."
  },
  {
    id: 103,
    title: "Fall Concert",
    date: "2025-11-15",
    time: "8:00 PM",
    location: "University Auditorium",
    description: "Featuring local bands and student performers!"
  }
];

function loadEvents() {
  const container = document.getElementById("events");
  
  container.innerHTML = "";
  
  if (mockEvents.length === 0) {
    container.innerHTML = '<p class="no-content">No upcoming events. Check back soon!</p>';
    return;
  }
  
  mockEvents.forEach(event => {
    const card = createEventCard(event);
    container.appendChild(card);
  });
}

function createEventCard(event) {
  const card = document.createElement("article");
  card.className = "card event-card";
  
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
  
  card.innerHTML = `
    <div class="card-badge event">Event</div>
    <h2>${escapeHtml(event.title)}</h2>
    <p class="card-meta">
      <i class="fa fa-calendar"></i> ${formattedDate} at ${escapeHtml(event.time)}<br>
      <i class="fa fa-map-marker"></i> ${escapeHtml(event.location)}
    </p>
    <p class="card-description">${escapeHtml(event.description)}</p>
  `;
  
  return card;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadEvents);