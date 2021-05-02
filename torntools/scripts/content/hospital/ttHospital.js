requireDatabase().then(() => {
	requirePlayerList(".users-list").then(() => {
		console.log("TT - Hospital");

		if (settings.scripts.no_confirm.revives) requireElement("a.revive").then(removeConfirmation);

		// Page changing
		doc.addEventListener("click", (event) => {
			if (event.target.classList && !event.target.classList.contains("gallery-wrapper") && hasParent(event.target, { class: "gallery-wrapper" })) {
				console.log("click");
				setTimeout(() => {
					requirePlayerList(".users-list").then(() => {
						if (settings.scripts.no_confirm.revives) requireElement("a.revive").then(removeConfirmation);
					});
				}, 300);
			}
		});
	});
});

function removeConfirmation() {
	for (let revive of doc.findAll("a.revive:not(.tt-modified)")) {
		revive.setAttribute("href", revive.getAttribute("href") + "&step=revive");
		revive.classList.add("tt-modified");
	}
}
