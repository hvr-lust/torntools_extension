// noinspection JSUnfilteredForInLoop

window.addEventListener("load", async () => {
	console.log("TT - Travel (abroad)");

	// Flying page
	const page = getSearchParameters().get("page");
	if (await isFlying()) {
		// Landing time
		if (doc.find(".flight-info .destination-title") && userdata.travel) {
			const landDate = new Date(userdata.travel.timestamp * 1000) - new Date() < 0 ? "N/A" : new Date(userdata.travel.timestamp * 1000);
			let hours, minutes, seconds;

			if (landDate !== "N/A") [hours, minutes, seconds] = [landDate.getHours(), landDate.getMinutes(), landDate.getSeconds()];

			const landingTimeDiv = doc.new({ type: "div", attributes: { style: "text-align: center;" } });
			const landingTimeDescription = doc.new({
				type: "span",
				class: "description",
				text: `Landing at ${landDate === "N/A" ? "N/A" : formatTime([hours, minutes, seconds], settings.format.time)}`,
			});
			landingTimeDiv.appendChild(landingTimeDescription);
			doc.find(".flight-info").insertBefore(landingTimeDiv, doc.find(".flight-info .destination-title").nextElementSibling);
		}
	}

	// Abroad
	if (await isAbroad()) {
		warnEnergy();

		if (page === null || page === "travel_table") {
			if (!doc.find(".info-msg-cont.red")) {
				updateYATAPrices();
			}

			let list = doc.find(".users-list");
			let title = list.previousElementSibling;

			addFilterToItems(() => doc.find(".users-list"), title);
		} else if (page === "people") {
			requirePlayerList(".users-list").then(async () => {
				await showUserInfo();

				let list = doc.find(".users-list");
				let title = list.previousElementSibling;

				addFilterToTable(list, title);
			});
		}
	}
});

function updateYATAPrices() {
	console.log("Updating YATA prices");

	// noinspection JSUnresolvedVariable,JSUnresolvedFunction
	let post_data = {
		client: "TornTools",
		version: chrome.runtime.getManifest().version,
		author_name: "Mephiles",
		author_id: 2087524,
		country: getCountryName(),
		items: [],
	};

	// Table content
	let rows = doc.findAll(".users-list>li");
	for (let row of rows) {
		let id = parseInt(row.find(".details").getAttribute("itemid"));
		let quantity = parseInt(row.find(".stck-amount").innerText.replace(/,/g, ""));
		let price = parseInt(row.find(".cost .c-price").innerText.replace("$", "").replace(/,/g, ""));

		// post_data.items[id] = {quantity: quantity, cost: price}
		post_data.items.push({
			id: id,
			quantity: quantity,
			cost: price,
		});
	}

	console.log("POST DATA", post_data);
	fetchRelay("yata__v1", { section: `travel/import`, method: "POST", postData: post_data })
		.then((result) => {
			console.log("yata PUSH", result);
		})
		.catch((err) => {
			console.log("ERROR", err);
		});

	function getCountryName() {
		return doc.find("#skip-to-content").innerText.slice(0, 3).toLowerCase();
	}
}

function addFilterToTable(list, title) {
	let filter_container = content
		.newContainer("Filters", {
			id: "tt-player-filter",
			class: "filter-container",
			next_element: title,
		})
		.find(".content");
	filter_container.innerHTML = `
		<div class="filter-header">
			<div class="statistic" id="showing">Showing <span class="filter-count">X</span> of <span class="filter-total">Y</span> users</div>
		</div>
		<div class="filter-content ${mobile ? "tt-mobile" : ""}">
			<div class="filter-wrap" id="activity-filter">
				<div class="filter-heading">Activity</div>
				<div class="filter-multi-wrap ${mobile ? "tt-mobile" : ""}">
					<div class="tt-checkbox-wrap"><input type="checkbox" value="online">Online</div>
					<div class="tt-checkbox-wrap"><input type="checkbox" value="idle">Idle</div>
					<div class="tt-checkbox-wrap"><input type="checkbox" value="offline">Offline</div>
				</div>
			</div>
			<div class="filter-wrap" id="faction-filter">
				<div class="filter-heading">Faction</div>
				<div class="filter-multi-wrap ${mobile ? "tt-mobile" : ""}">
					<select name="faction" id="tt-faction-filter">
						<option selected value="">none</option>
					</select>
				</div>
			</div>
			<div class='filter-wrap' id='special-filter'>
				<div class='filter-heading'>Special</div>
				<div class='filter-multi-wrap ${mobile ? "tt-mobile" : ""}'>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='isfedded-yes'>N:<input type='checkbox' value='isfedded-no'>Fedded</div>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='newplayer-yes'>N:<input type='checkbox' value='newplayer-no'>New Player</div>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='onwall-yes'>N:<input type='checkbox' value='onwall-no'>On Wall</div>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='incompany-yes'>N:<input type='checkbox' value='incompany-no'>In Company</div>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='infaction-yes'>N:<input type='checkbox' value='infaction-no'>In Faction</div>
					<div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='isdonator-yes'>N:<input type='checkbox' value='isdonator-no'>Is Donator</div>
				</div>
			</div>
			<div class="filter-wrap" id="status-filter">
				<div class="filter-heading">Status</div>
				<div class="filter-multi-wrap ${mobile ? "tt-mobile" : ""}">
					<div class="tt-checkbox-wrap"><input type="checkbox" value="okay">Okay</div>
					<div class="tt-checkbox-wrap"><input type="checkbox" value="hospital">Hospital</div>
				</div>
			</div>
			<div class="filter-wrap" id="level-filter">
				<div class="filter-heading">Level</div>
				<div id="tt-level-filter" class="filter-slider"></div>
				<div class="filter-slider-info"></div>
			</div>
		</div>
	`;

	// Initializing
	let level_start = filters.overseas.level[0] || 0;
	let level_end = filters.overseas.level[1] || 100;

	// Special
	for (let key in filters.overseas.special) {
		switch (filters.overseas.special[key]) {
			case "yes":
				filter_container.find(`#special-filter input[value='${key}-yes']`).checked = true;
				break;
			case "no":
				filter_container.find(`#special-filter input[value='${key}-no']`).checked = true;
				break;
			case "both":
				filter_container.find(`#special-filter input[value='${key}-yes']`).checked = true;
				filter_container.find(`#special-filter input[value='${key}-no']`).checked = true;
				break;
			default:
				filter_container.find(`#special-filter input[value='${key}-yes']`).checked = true;
				filter_container.find(`#special-filter input[value='${key}-no']`).checked = true;
				break;
		}
	}

	// Level slider
	let level_slider = filter_container.find("#tt-level-filter");
	noUiSlider.create(level_slider, {
		start: [level_start, level_end],
		step: 1,
		connect: true,
		range: {
			min: 0,
			max: 100,
		},
	});

	let level_slider_info = level_slider.nextElementSibling;
	level_slider.noUiSlider.on("update", (values) => {
		values = values.map((x) => parseInt(x));
		level_slider_info.innerHTML = `Level: ${values.join(" - ")}`;
	});

	// Event listeners
	for (let checkbox of filter_container.findAll(".tt-checkbox-wrap input")) {
		checkbox.onclick = applyFilters;
	}
	for (let dropdown of filter_container.findAll("select")) {
		dropdown.onchange = applyFilters;
	}
	let filter_observer = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			if (
				mutation.type === "attributes" &&
				mutation.attributeName === "aria-valuenow" &&
				(hasClass(mutation.target, "noUi-handle-lower") || hasClass(mutation.target, "noUi-handle-upper"))
			) {
				applyFilters();
			}
		}
	});
	filter_observer.observe(filter_container, { attributes: true, subtree: true });

	// Page changing
	doc.addEventListener("click", (event) => {
		if (event.target.classList && !event.target.classList.contains("gallery-wrapper") && hasParent(event.target, { class: "gallery-wrapper" })) {
			console.log("click");
			setTimeout(() => {
				requirePlayerList(".users-list").then(() => {
					console.log("loaded");
					// populateFactions();
					applyFilters();
				});
			}, 300);
		}
	});

	// Initializing
	for (let state of filters.overseas.activity) {
		doc.find(`#activity-filter input[value='${state}']`).checked = true;
	}
	for (let state of filters.overseas.status) {
		doc.find(`#status-filter input[value='${state}']`).checked = true;
	}
	// if(filters.overseas.faction.default){
	//     doc.find(`#faction-filter option[value='${filters.overseas.faction}']`).selected = true;
	// }

	populateFactions();
	applyFilters();

	function applyFilters() {
		let activity = [];
		let status = [];
		let special = {};
		let faction;
		// let time = []
		let level = [];

		// Activity
		for (let checkbox of doc.findAll("#activity-filter .tt-checkbox-wrap input:checked")) {
			activity.push(checkbox.getAttribute("value"));
		}
		// Status
		for (let checkbox of doc.findAll("#status-filter .tt-checkbox-wrap input:checked")) {
			status.push(checkbox.getAttribute("value"));
		}
		// Faction
		faction = doc.find("#faction-filter select").value;
		// Special
		for (let key in filters.overseas.special) {
			if (
				doc.find(`#tt-player-filter #special-filter input[value='${key}-yes']`).checked &&
				doc.find(`#tt-player-filter #special-filter input[value='${key}-no']`).checked
			) {
				special[key] = "both";
			} else if (doc.find(`#tt-player-filter #special-filter input[value='${key}-yes']`).checked) {
				special[key] = "yes";
			} else if (doc.find(`#tt-player-filter #special-filter input[value='${key}-no']`).checked) {
				special[key] = "no";
			} else {
				special[key] = "both";
			}
		}
		// Level
		level.push(parseInt(doc.find("#level-filter .noUi-handle-lower").getAttribute("aria-valuenow")));
		level.push(parseInt(doc.find("#level-filter .noUi-handle-upper").getAttribute("aria-valuenow")));

		// Filtering
		for (let li of list.findAll(":scope>li")) {
			if (li.classList.contains("tt-user-info") || li.classList.contains("tt-userinfo-container")) continue;

			showRow(li);

			// Level
			let player_level = parseInt(li.find(".level").innerText.trim().replace("LEVEL:", "").trim());
			if (!(level[0] <= player_level && player_level <= level[1])) {
				showRow(li, false);
				continue;
			}

			// Activity
			let matches_one_activity = activity.length === 0;
			for (let state of activity) {
				if (li.querySelector(`li[id^='${ACTIVITY_FILTER_DICT[state]}']`)) {
					matches_one_activity = true;
				}
			}
			if (!matches_one_activity) {
				showRow(li, false);
				continue;
			}

			// Faction
			if (faction && li.find(".user.faction img") && li.find(".user.faction img").getAttribute("title").trim() !== faction) {
				showRow(li, false);
				continue;
			}

			// Status
			let matches_one_status = status.length === 0;
			for (let state of status) {
				if (li.find(`.status`).innerText.replace("STATUS:", "").trim().toLowerCase() === state) {
					matches_one_status = true;
				}
			}
			if (!matches_one_status) {
				showRow(li, false);
			}

			// Special
			for (let key in special) {
				console.log(key, special[key]);
				if (special[key] === "both") continue;

				if (special[key] === "yes") {
					let matchesOneIcon = false;
					for (let icon of SPECIAL_FILTER_DICT[key]) {
						if (li.querySelector(`li[id^='${icon}']`)) {
							matchesOneIcon = true;
							break;
						}
					}

					if (!matchesOneIcon) {
						showRow(li, false);
					}
				} else if (special[key] === "no") {
					let matchesOneIcon = false;
					for (let icon of SPECIAL_FILTER_DICT[key]) {
						if (li.querySelector(`li[id^='${icon}']`)) {
							matchesOneIcon = true;
							break;
						}
					}

					if (matchesOneIcon) {
						showRow(li, false);
					}
				}
			}
		}

		ttStorage.change({
			filters: {
				overseas: {
					activity: activity,
					status: status,
					faction: faction,
					// time: time,
					level: level,
				},
			},
		});

		updateStatistics();
	}

	function showRow(row, show = true) {
		if (show) {
			row.classList.remove("filter-hidden");
			if (
				row.nextElementSibling &&
				(row.nextElementSibling.classList.contains("tt-user-info") || row.nextElementSibling.classList.contains("tt-userinfo-container"))
			)
				row.nextElementSibling.classList.remove("filter-hidden");
		} else {
			row.classList.add("filter-hidden");
			if (
				row.nextElementSibling &&
				(row.nextElementSibling.classList.contains("tt-user-info") || row.nextElementSibling.classList.contains("tt-userinfo-container"))
			)
				row.nextElementSibling.classList.add("filter-hidden");
		}
	}

	function populateFactions() {
		let factionTags = [...list.findAll(":scope>li")]
			.map((x) => (x.find(".user.faction img") ? x.find(".user.faction img").getAttribute("title") : x.find(".user.faction").innerText))
			.filter((x) => x.trim() !== "");
		factionTags = [...new Set(factionTags)];
		for (let tag of factionTags) {
			filter_container.find("select#tt-faction-filter").insertAdjacentHTML("beforeend", `<option value="${tag}">${tag}</option>`);
		}
	}

	function updateStatistics() {
		doc.find(".statistic#showing .filter-count").innerText = [...list.findAll(":scope>li:not(.tt-userinfo-container)")].filter(
			(x) => !x.classList.contains("filter-hidden")
		).length;
		doc.find(".statistic#showing .filter-total").innerText = list.findAll(":scope>li:not(.tt-userinfo-container)").length;
	}
}

async function showUserInfo() {
	if (!(settings.scripts.stats_estimate.global && settings.scripts.stats_estimate.abroad)) return;

	estimateStatsInList(".users-list > li", (row) => {
		return {
			userId: row.find("a.user.name").getAttribute("data-placeholder")
				? row.find("a.user.name").getAttribute("data-placeholder").split(" [")[1].split("]")[0]
				: row.find("a.user.name").getAttribute("href").split("XID=")[1],
			level: parseInt(row.find(".level").innerText.split("\n")[1]) || 0,
		};
	});
}

function warnEnergy() {
	if (doc.find(".travel-home-content")) listen();
	else
		new MutationObserver((mutations, observer) => {
			if (!doc.find(".travel-home-content")) return;

			listen();
			observer.disconnect();
		}).observe(doc.find("#mainContainer > .content-wrapper"), { childList: true, subtree: true });

	function listen() {
		if (doc.find(".travel-home-content").getAttribute("style").includes("display: none")) show();

		new MutationObserver((mutations) => {
			// noinspection JSUnresolvedFunction
			if (mutations[0].target.getAttribute("style").includes("display: none")) return;

			show();
		}).observe(doc.find(".travel-home-content"), { attributes: true, attributeFilter: ["style"] });
	}

	function show() {
		let content = doc.find(".travel-home-content .msg > p");
		let search = content.innerText.match(/take around (.*) to reach/i);
		if (!search) return;

		const splitTime = search[1].split(" ");

		let hours = 0,
			minutes = 0;
		if (splitTime.includes("minutes")) minutes = parseInt(splitTime[splitTime.indexOf("minutes") - 1]);
		if (splitTime.includes("hours")) hours = parseInt(splitTime[splitTime.indexOf("hours") - 1]);

		// noinspection JSUnresolvedVariable
		const fulltime = userdata.energy.fulltime;
		const flytime = (hours * 60 + minutes) * 60;

		if (fulltime < flytime) {
			content.appendChild(doc.new("br"));
			content.appendChild(
				doc.new({
					type: "span",
					text: "Starting this flight will waste some energy!",
					attributes: { color: "error" },
				})
			);
		}
	}
}

function addFilterToItems(listGetter, title) {
	let filter_container = content
		.newContainer("Filters", {
			id: "tt-item-filter",
			class: "filter-container",
			next_element: title,
			collapseId: "-items",
		})
		.find(".content");

	filter_container.innerHTML = `
		<div class="filter-header">
			<div class="statistic" id="showing">Showing <span class="filter-count">X</span> of <span class="filter-total">Y</span> items</div>
		</div>
		<div class="filter-content">
			${
				settings.pages.travel.profits
					? `
			<div class="filter-wrap" id="profit-filter">
				<div class="filter-heading">Profit</div>
				<div class="filter-multi-wrap">
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="profit" id="only_profit">
						<label for="only_profit">Only Profit</label>
					</div>
				</div>
			</div>
			`
					: ""
			}
			<div class="filter-wrap" id="category-filter">
				<div class="filter-heading">Categories</div>
				<div class="filter-multi-wrap">
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_plushie" value="plushie">
						<label for="category_plushie">Plushies</label>
					</div>
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_flower" value="flower">
						<label for="category_flower">Flowers</label>
					</div>
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_drug" value="drug">
						<label for="category_drug">Drugs</label>
					</div>
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_weapon" value="weapon">
						<label for="category_weapon">Weapons</label>
					</div>
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_armor" value="armor">
						<label for="category_armor">Armor</label>
					</div>
					<div class="tt-checkbox-wrap">
						<input type="checkbox" name="category" id="category_other" value="other">
						<label for="category_other">Other</label>
					</div>
				</div>
			</div>
		</div>
	`;

	/*
	 * Initializing filters.
	 */
	filter_container.find("#only_profit").checked = filters.abroadItems.profitOnly;
	for (let category of filters.abroadItems.categories) {
		filter_container.find(`#category-filter input[name="category"][value="${category}"]`).checked = true;
	}

	// Event listeners
	for (let checkbox of filter_container.findAll(".tt-checkbox-wrap input")) {
		checkbox.onclick = applyFilters;
	}

	applyFilters();

	function applyFilters() {
		let profitOnly = settings.pages.travel.profits && filter_container.find("#only_profit").checked;
		let categories = [];
		let categoriesExtra = [];

		// Categories
		for (let checkbox of filter_container.findAll("#category-filter .tt-checkbox-wrap input:checked")) {
			const value = checkbox.getAttribute("value");

			categories.push(value);

			switch (value) {
				case "weapon":
					categoriesExtra.push("primary");
					categoriesExtra.push("secondary");
					categoriesExtra.push("defensive");
					categoriesExtra.push("melee");
					categoriesExtra.push("temporary");
					break;
				case "other":
					categoriesExtra.push("enhancer");
					categoriesExtra.push("clothing");
					categoriesExtra.push("alcohol");
					// FIXME - Add more missing categories.
					break;
			}
		}

		// Filtering
		for (let li of listGetter().findAll(":scope > li")) {
			showRow(li);

			// Profit Only
			if (profitOnly && li.find(".tt-travel-market-cell").getAttribute("value") < 0) {
				showRow(li, false);
				continue;
			}

			// Categories
			if (categories.length || categoriesExtra.length) {
				const itemCategory = li
					.find(".type")
					.innerText.split("\n")
					.filter((x) => !!x)[1]
					.toLowerCase();

				let matchesCategory = false;
				for (let category of [...categories, ...categoriesExtra]) {
					if (itemCategory === category) {
						// FIXME Add category check.
						matchesCategory = true;
					}
				}

				if (!matchesCategory) {
					showRow(li, false);
				}
			}
		}

		ttStorage.change({
			filters: {
				abroadItems: {
					profitOnly,
					categories,
				},
			},
		});

		updateStatistics();
	}

	function showRow(row, show = true) {
		if (show) {
			row.classList.remove("filter-hidden");
		} else {
			row.classList.add("filter-hidden");
		}
	}

	function updateStatistics() {
		const list = listGetter();

		filter_container.find(".statistic#showing .filter-count").innerText = [...list.findAll(":scope>li:not(.tt-userinfo-container)")].filter(
			(x) => !x.classList.contains("filter-hidden")
		).length;
		filter_container.find(".statistic#showing .filter-total").innerText = [...list.findAll(":scope>li:not(.tt-userinfo-container)")].length;
	}
}
