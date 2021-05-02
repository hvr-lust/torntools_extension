requireDatabase().then(() => {
	requirePlayerList(".users-list").then(() => {
		console.log("TT - Jail");

		let title = doc.find(".users-list").previousElementSibling;

		if (shouldDisable()) return;

		addFilterToTable(title);
		showQuick();
	});
});

function addFilterToTable(title) {
	content.newContainer("Filters", { id: "tt-player-filter", class: "filter-container", next_element: title });
}

function showQuick() {
	show("tt-quick-bust", "Bust", "quick_bust", ".bust");
	show("tt-quick-bail", "Bail", "quick_bail", ".buy, .bye");

	function show(id, text, option, wrapSelector) {
		if (!doc.find(`#${id}`)) {
			let wrap = doc.new({ type: "div", class: "tt-checkbox-wrap in-title" });
			let checkbox = doc.new({ type: "input", id, attributes: { type: "checkbox" } });
			wrap.appendChild(checkbox);
			wrap.appendChild(doc.new({ type: "label", text: `Enable Quick ${text}`, attributes: { for: id } }));
			doc.find("#tt-player-filter .tt-options").appendChild(wrap);

			wrap.onclick = (event) => {
				event.stopPropagation();
			};

			checkbox.onchange = (event) => {
				modify(event.target.checked);

				ttStorage.change({ settings: { pages: { jail: { [option]: event.target.checked } } } });
			};

			if (settings.pages.jail[option]) {
				checkbox.checked = true;
				modify(true);
			}
		} else if (doc.find(`#${id}`).checked) {
			modify(true);
		}

		function modify(enabled) {
			for (let player of doc.findAll(".users-list > li")) {
				const actionWrap = player.find(wrapSelector);
				let bail = actionWrap.getAttribute("href");

				if (enabled) {
					if (bail[bail.length - 1] !== "1") bail += "1";

					if (!actionWrap.find(".tt-modified-icon")) {
						actionWrap.find(":scope > span[class$='-icon']").appendChild(doc.new({ type: "span", class: "tt-modified-icon", text: "Q" }));
					}
				} else {
					if (bail[bail.length - 1] === "1") bail = bail.slice(0, bail.length - 1);

					for (let icon of actionWrap.findAll(".tt-modified-icon")) icon.remove();
				}

				actionWrap.setAttribute("href", bail);
			}
		}
	}
}
