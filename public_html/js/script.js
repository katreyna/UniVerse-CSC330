// handle  register data

document.addEventListener("DOMContentLoaded", () => {
	const registerButton = document.getElementById("register");
	
	if (registerButton) {
		registerButton.addEventListener("click", () => {
			const email = document.querySelector('input[name="email"]').value;
			const username = document.querySelector('input[name="user"]').value;
			const password = document.querySelector('input[name="password"]').value;
		// validate
		 if (!email || !username || !password) {
			alert("You must complete all fields.");
			return;
		}
		
		const data = JSON.stringify ({
			email: email,
			username: username,
			password: password
		});
		
		const xmlhttp = new XMLHttpRequest();
		xmlhttp.open("POST", "/register", true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		
		xmlhttp.onreadystatechange = function () { // runs every time ajax request changes
			if (xmlhttp.readyState === 4) { //done loading
				if (xmlhttp.status === 200) { //no error
					const result = JSON.parse(xmlhttp.responseText) // parse data
					alert(result.message);
				} else {
					alert("Error: " + xmlhttp.status);
				}
			}
		};
		xmlhttp.send(data);
		});
	}
});
