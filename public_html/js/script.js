// handle register data
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
		xmlhttp.withCredentials = true; // ADD THIS LINE - enables cookies
		
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState === 4) {
				const result = JSON.parse(xmlhttp.responseText);

				if (xmlhttp.status === 200 && result.success) {
					window.location.href = "/home";
				} else {
					alert("Error: " + (result.message || xmlhttp.status));
				}
			}
		};
		xmlhttp.send(data);
		});
	}
});


// handle login data
document.addEventListener("DOMContentLoaded", () => {
	const loginButton = document.getElementById("login");

	if (loginButton) {
		loginButton.addEventListener("click", () => {
			const email = document.querySelector('input[name="email"]').value;
			const password = document.querySelector('input[name="password"]').value;

			if (!email || !password) {
				alert("You must complete all fields.");
				return;
			}

			const data = JSON.stringify({ email, password });

			const xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "/login", true);
			xmlhttp.setRequestHeader("Content-Type", "application/json");
			xmlhttp.withCredentials = true; // ADD THIS LINE - enables cookies

			xmlhttp.onreadystatechange = function () {
				if (xmlhttp.readyState === 4) {
					const result = JSON.parse(xmlhttp.responseText);

					if (xmlhttp.status === 200 && result.success) {
						// Redirect to events page after successful login
						window.location.href = "/events";
					} else {
						alert(result.message || "Login failed");
					}
				}
			};

			xmlhttp.send(data);
		});
	}
});
