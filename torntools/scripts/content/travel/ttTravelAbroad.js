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
			if (settings.pages.travel.profits) {
				displayItemProfits(itemlist.items);
			}
			addFillMaxButtons();
			addItemSortingCapabilities();

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

function displayItemProfits(itemlist) {
	let market = doc.find(".travel-agency-market");

	if (!market) {
		console.log("No market");
		return;
	}

	// Table heading
	let headings = market.find(".items-list-title");
	let profit_heading = doc.new("div");
	profit_heading.innerText = "Profit";
	profit_heading.setClass("tt-travel-market-heading title-green item-profit");

	headings.insertBefore(profit_heading, headings.find(".stock-b"));

	// Table content
	let rows = doc.findAll(".users-list > li");
	for (let row of rows) {
		let id = parseInt(row.find(".details").getAttribute("itemid"));
		let market_price = parseInt(itemlist[id].market_value);
		let buy_price = parseInt(row.find(".cost .c-price").innerText.replace("$", "").replace(/,/g, ""));
		// noinspection JSCheckFunctionSignatures
		let profit = parseInt(market_price - buy_price);

		let span = doc.new({ type: "span", class: "tt-travel-market-cell", attributes: { value: profit } });
		let inner_span = doc.new("span");
		inner_span.innerText = `${profit < 0 ? "-$" : "+$"}${numberWithCommas(Math.abs(profit))}`;

		// let triangle_div = doc.new("div");
		// triangle_div.setClass("tt-travel-price-indicator");

		if (buy_price > market_price) {
			span.style.color = "#de0000";
			// triangle_div.style.borderTop = "8px solid #de0000";
		} else if (buy_price < market_price) {
			span.style.color = "#00a500";
			// triangle_div.style.borderBottom = "8px solid #00a500"
		}

		// inner_span.appendChild(triangle_div);
		span.appendChild(inner_span);
		row.find(".item-info-wrap").insertBefore(span, row.find(".item-info-wrap").find(".stock"));
	}
}

function addFillMaxButtons() {
	let market = doc.find(".travel-agency-market");

	if (!market) {
		console.log("No market");
		return;
	}

	for (let buy_btn of market.findAll(".buy")) {
		let max_span = doc.new({ type: "span", text: "fill max", class: "tt-max-buy bold" });
		buy_btn.parentElement.appendChild(max_span);

		max_span.addEventListener("click", (event) => {
			event.stopPropagation();

			let max = parseInt(buy_btn.parentElement.parentElement.find(".stck-amount").innerText.replace(/,/g, ""));
			let price = parseInt(buy_btn.parentElement.parentElement.find(".c-price").innerText.replace(/,/g, "").replace("$", ""));
			let user_money = doc.find(".user-info .msg .bold:nth-of-type(2)").innerText.replace(/,/g, "").replace("$", "");
			let bought = parseInt(doc.find(".user-info .msg .bold:nth-of-type(3)").innerText);
			let limit = parseInt(doc.find(".user-info .msg .bold:nth-of-type(4)").innerText) - bought;

			max = max > limit ? limit : max;
			max = Math.floor(user_money / price) < max ? Math.floor(user_money / price) : max;

			console.log(buy_btn.parentElement.find("input[name='amount']"));
			buy_btn.parentElement.find("input[name='amount']").value = max;
			buy_btn.parentElement.find("input[name='amount']").setAttribute("value", max);

			// for value to be accepted
			buy_btn.parentElement.find("input[name='amount']").dispatchEvent(new Event("blur"));
		});
	}
}

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

function addItemSortingCapabilities() {
	const headers = [...doc.find(".items-list-title").findAll(".type-b, .name-b, .cost-b, .item-profit, .stock-b, .circulation-b")];
	const defaultHeader = doc.find(".items-list-title .cost-b");

	for (let header of headers) {
		header.classList.add("sortable");

		header.addEventListener("click", () => {
			const order = toggleSorting(header);

			// Remove all other sorting.
			headers
				.filter((x) => x !== header)
				.map((x) => x.find("i"))
				.filter((x) => !!x)
				.forEach((x) => x.remove());

			if (order === "none") {
				sort("asc", defaultHeader);
			} else {
				sort(order, header);
			}
		});
	}

	if (sorting.abroadItems.column !== "default") {
		const header = doc.find(`.items-list-title .${sorting.abroadItems.column}`);

		header.appendChild(doc.new({ type: "i", class: `fas ${sorting.abroadItems.order === "asc" ? "fa-caret-down" : "fa-caret-up"} tt-title-icon-torn` }));
		sort(sorting.abroadItems.order, header);
	}

	function toggleSorting(header) {
		const icon = header.find("i");
		if (icon) {
			if (icon.classList.contains("fa-caret-down")) {
				icon.classList.remove("fa-caret-down");
				icon.classList.add("fa-caret-up");
				return "desc";
			} else {
				icon.remove();
				return "none";
			}
		} else {
			header.appendChild(doc.new({ type: "i", class: "fas fa-caret-down tt-title-icon-torn" }));
			return "asc";
		}
	}

	function sort(order, header) {
		const list = doc.find(".travel-agency-market .users-list");
		const newList = list.cloneNode(false);

		let valueSelector, type;
		if (header.classList.contains("type-b")) {
			type = "type-b";
			valueSelector = ".type";
		} else if (header.classList.contains("name-b")) {
			type = "name-b";
			valueSelector = ".name";
		} else if (header.classList.contains("cost-b")) {
			type = "cost-b";
			valueSelector = ".cost .c-price";
		} else if (header.classList.contains("item-profit")) {
			type = "item-profit";
			valueSelector = ".tt-travel-market-cell";
		} else if (header.classList.contains("stock-b")) {
			type = "stock-b";
			valueSelector = ".stock";
		} else if (header.classList.contains("circulation-b")) {
			type = "circulation-b";
			valueSelector = ".circulation";
		} else {
			type = "default";
			valueSelector = ".cost .c-price";
		}

		const rows = [...list.childNodes].filter((node) => node.nodeName === "LI");
		if (order === "asc") {
			rows.sort((a, b) => {
				const helper = sortHelper(a.children[0], b.children[0]);

				return helper.a - helper.b;
			});
		} else {
			rows.sort((a, b) => {
				const helper = sortHelper(a.children[0], b.children[0]);

				return helper.b - helper.a;
			});
		}
		rows.forEach((row) => newList.appendChild(row));

		list.parentNode.replaceChild(newList, list);

		ttStorage.change({ sorting: { abroadItems: { column: type, order } } });

		function sortHelper(elementA, elementB) {
			elementA = elementA.find(valueSelector);
			elementB = elementB.find(valueSelector);

			let valueA, valueB;
			if (elementA.hasAttribute("value")) {
				valueA = elementA.getAttribute("value");
				valueB = elementB.getAttribute("value");
			} else {
				valueA = elementA.innerText;
				valueB = elementB.innerText;

				if (elementA.find(".t-show, .wai") && valueA.includes("\n")) {
					valueA = valueA.split("\n").filter((x) => !!x)[1];
					valueB = valueB.split("\n").filter((x) => !!x)[1];
				}
			}

			let a, b;
			if (isNaN(parseFloat(valueA))) {
				if (valueA.includes("$")) {
					a = parseFloat(valueA.replace("$", "").replace(/,/g, ""));
					b = parseFloat(valueB.replace("$", "").replace(/,/g, ""));
				} else {
					a = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
					b = 0;
				}
			} else {
				a = parseFloat(valueA.replaceAll(",", ""));
				b = parseFloat(valueB.replaceAll(",", ""));
			}

			return { a, b };
		}
	}
}
