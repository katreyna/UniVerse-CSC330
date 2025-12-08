document.addEventListener("DOMContentLoaded", async () => {
    /* switch tabs */
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    /* edit profile */
    const modal = document.getElementById("edit-profile-modal");
    const editBtn = document.getElementById("edit-profile-button");
    const closeBtn = document.querySelector(".close");
    const saveBtn = document.getElementById("save-changes");

    const usernameEl = document.getElementById("username");
    const bioEl = document.getElementById("bio");
    const profilePic = document.getElementById("profile-pic");

    const editUsername = document.getElementById("edit-username");
    const editBio = document.getElementById("edit-bio");
    const editPic = document.getElementById("edit-pic");

    // load profile from server
    async function loadProfile() {
        try {
            const res = await fetch("/api/profile", { credentials: "include" });
            const data = await res.json();

            if (res.ok) {
                usernameEl.textContent = data.username;
                bioEl.textContent = data.bio || "";
                profilePic.src = data.profile_pic || "/default-profile.png";
            } else {
                console.error("Failed to load profile:", data.error);
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    }

    await loadProfile();

    /* open modal */
    editBtn.addEventListener("click", () => {
        modal.style.display = "block";
        editUsername.value = usernameEl.textContent.trim();
        editBio.value = bioEl.textContent.trim() || "";
    });

    /* close modal */
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };

    /* save changes */
    saveBtn.addEventListener("click", async () => {
        const formData = new FormData();
        formData.append("username", editUsername.value);
        formData.append("bio", editBio.value);

        if (editPic.files && editPic.files[0]) {
            formData.append("profile_pic", editPic.files[0]);
        }

        try {
            const res = await fetch("/api/profile/update", {
                method: "POST",
                credentials: "include",
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.success) {
                usernameEl.textContent = editUsername.value;
                bioEl.textContent = editBio.value;
                if (data.profile_pic) profilePic.src = data.profile_pic;
                modal.style.display = "none";
            } else {
                alert("Failed to update profile: " + data.message);
            }
        } catch (err) {
            console.error("Update profile error:", err);
        }
    });
});
