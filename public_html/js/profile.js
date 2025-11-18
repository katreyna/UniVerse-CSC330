document.addEventListener("DOMContentLoaded", () => {

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


   /* edit profile popup */
   
    const modal = document.getElementById("edit-profile-modal");
    const editButton = document.getElementById("edit-profile-button");   
    const closeButton = document.querySelector(".close");                
    const saveButton = document.getElementById("save-changes");         

    const usernameEl = document.getElementById("username");
    const bioEl = document.getElementById("bio");
    const profilePic = document.getElementById("profile-pic");

    const editUsername = document.getElementById("edit-username");
    const editBio = document.getElementById("edit-bio");
    const editPic = document.getElementById("edit-pic");

    editButton.addEventListener("click", () => {   
        modal.style.display = "block";
        editUsername.value = usernameEl.textContent;
        editBio.value = bioEl.textContent;
    });

    closeButton.addEventListener("click", () => {  
        modal.style.display = "none";
    });

    window.onclick = function(e) {
        if (e.target === modal) modal.style.display = "none";
    };


    /* save profile changes */
    saveButton.addEventListener("click", () => {  
        usernameEl.textContent = editUsername.value;
        bioEl.textContent = editBio.value;

        if (editPic.files && editPic.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePic.src = e.target.result;
            };
            reader.readAsDataURL(editPic.files[0]);
        }

        modal.style.display = "none";
    });

</script>
