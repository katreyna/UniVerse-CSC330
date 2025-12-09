document.addEventListener("DOMContentLoaded", () => {
    /* ---------- elements ---------- */
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
    const usernameEl = document.getElementById("username");
    const bioEl = document.getElementById("bio");
    const profilePicEl = document.getElementById("profile-pic");
    const followersEl = document.getElementById("followers-count");
    const followingEl = document.getElementById("following-count");
    const editBtn = document.getElementById("edit-profile-button");
    const modal = document.getElementById("edit-profile-modal");
    const closeBtn = document.querySelector(".close");
    const saveBtn = document.getElementById("save-changes");
    const editUsername = document.getElementById("edit-username");
    const editBio = document.getElementById("edit-bio");
    const editPic = document.getElementById("edit-pic");

    /* ---------- switch tabs ---------- */
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    /* ---------- load profile ---------- */
    async function loadProfile() {
        try {
            const res = await fetch("/api/profile", { credentials: "include" });
            
            // Handle unauthorized - redirect to login
            if (res.status === 401) {
                window.location.href = "/login.html";
                return;
            }
            
            if (!res.ok) throw new Error("Failed to load profile");
            
            const data = await res.json();
            usernameEl.textContent = data.username;
            bioEl.textContent = data.bio || "";
            profilePicEl.src = data.profile_pic || "/uploads/profiles/default.png";
            followersEl.textContent = data.followers || 0;
            followingEl.textContent = data.following || 0;
        } catch (err) {
            console.error("Failed to load profile:", err);
            // If it's a network error or other issue, show error message
            alert("Failed to load profile. Please try again.");
        }
    }
    
    loadProfile();

    /* ---------- edit profile modal ---------- */
    editBtn.addEventListener("click", () => {
        modal.style.display = "block";
        editUsername.value = usernameEl.textContent.trim();
        editBio.value = bioEl.textContent.trim();
    });

    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    /* ---------- save profile changes ---------- */
    saveBtn.addEventListener("click", async () => {
        const formData = new FormData();
        formData.append("username", editUsername.value.trim());
        formData.append("bio", editBio.value.trim());
        if (editPic.files && editPic.files[0]) formData.append("profile_pic", editPic.files[0]);

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                credentials: "include",
                body: formData
            });
            
            // Handle unauthorized during update
            if (res.status === 401) {
                window.location.href = "/login.html";
                return;
            }
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to update");
            
            // Update UI with new info
            usernameEl.textContent = editUsername.value.trim();
            bioEl.textContent = editBio.value.trim();
            if (result.profile_pic) profilePicEl.src = result.profile_pic;
            
            modal.style.display = "none";
        } catch (err) {
            console.error("Failed to update profile:", err);
            alert("Failed to update profile");
        }
    });
});
