let ownFaction = false;
let member_info_added = false;

requireDatabase().then(() => {
	addXHRListener((event) => {
		const { page, xhr } = event.detail;

		const params = new URLSearchParams(xhr.requestBody);
		const step = params.get("step");
		if (page === "factions") {
			if (step === "mainnews" && parseInt(params.get("type")) === 4 && settings.pages.faction.armory) {
				//newstabLoaded("armory").then(shortenArmoryNews);
			} else if (step === "getMoneyDepositors") {
				loadGiveToUser();
			} else if (step === "crimesInitiate") {
				//  || (step === "crimesPlane" && json.success)
				setTimeout(loadCrimes, 250);
			} else if (step === "crimes") {
				loadCrimes();
			}
		}
	});

	requireContent().then(() => {
		console.log("TT - Faction", subpage(), getSearchParameters().get("step"));

		if (getSearchParameters().get("step") === "your") {
			ownFaction = true;

			switch (subpage()) {
				case "main":
					loadMain();
					break;
				case "info":
					loadInfo();
					break;
				case "crimes":
					loadCrimes();
					break;
				case "upgrades":
					loadUpgrades();
					break;
				case "armoury":
					loadArmory();
					break;
				case "controls":
					loadControls();
					break;
				default:
					break;
			}

			// Main page
			doc.find(".faction-tabs li[data-case=main]").addEventListener("click", loadMain);

			// Info page
			doc.find(".faction-tabs li[data-case=info]").addEventListener("click", loadInfo);

			// Crimes page
			doc.find(".faction-tabs li[data-case=crimes]").addEventListener("click", loadCrimes);

			// Upgrades page
			doc.find(".faction-tabs li[data-case=upgrades]").addEventListener("click", loadUpgrades);

			// Armory page
			doc.find(".faction-tabs li[data-case=armoury]").addEventListener("click", loadArmory);

			// Controls page
			doc.find(".faction-tabs li[data-case=controls]").addEventListener("click", loadControls);
		} else {
			// noinspection EqualityComparisonWithCoercionJS,JSUnresolvedVariable
			ownFaction = userdata.faction ? getSearchParameters().get("ID") == userdata.faction.faction_id : false;

			loadInfo();
		}
	});
});

function loadMain() {
	subpageLoaded("main").then(() => {
		fullInfoBox("main");
		foldFactionDesc();

		if (ownFaction && settings.scripts.stats_estimate.global && settings.scripts.stats_estimate.faction_wars) observeWarlist();
		displayWarOverTimes();
	});
}

function loadInfo() {
	subpageLoaded("info").then(() => {
		fullInfoBox("info");
		foldFactionDesc();

		if (ownFaction) {
			if (settings.pages.faction.armory_worth) armoryWorth();
		}
	});

	if (settings.scripts.stats_estimate.global && settings.scripts.stats_estimate.faction_wars) observeWarlist();
	if (!ownFaction) displayWarOverTimes();

	requirePlayerList(".members-list .table-body").then(async () => {
		await showUserInfo();

		// Player list filter
		let list = doc.find(".members-list .table-body");
		let title = list.previousElementSibling;

		addFilterToTable(list, title);
		if (settings.pages.faction.member_index) addNumbersToMembers();
	});
}

function loadCrimes() {
	if (doc.find(".faction-crimes-wrap.tt-modified")) return;

	subpageLoaded("crimes").then(() => {
		if (doc.find(".faction-crimes-wrap.tt-modified")) return;

		if (settings.pages.faction.oc_time && Object.keys(oc).length > 0) {
			ocTimes(oc, settings.format);
		} else if (Object.keys(oc).length === 0) {
			console.log("NO DATA (might be no API access)");
		}

		if (settings.pages.faction.oc_advanced) {
			openOCs();
			showAvailablePlayers();
			showRecommendedNNB();
			showNNB();
			highlightOwnOC();
		}

		doc.find(".faction-crimes-wrap").classList.add("tt-modified");
	});
}

function loadUpgrades() {
	upgradesInfoListener();
	exportChallengeContributionsCSV();
}

function loadArmory() {
	armoryTabsLoaded().then(() => {
		armoryFilter();
	});
}

function loadControls() {
	const btnGiveToUser = doc.find(".control-tabs > li[aria-controls='option-give-to-user']");

	if (btnGiveToUser) {
		btnGiveToUser.addEventListener("click", () => {
			if (doc.find(".control-tabs > li[aria-controls='option-give-to-user']").getAttribute("aria-selected")) {
				loadGiveToUser();
			}
		});
		if (btnGiveToUser.getAttribute("aria-selected")) {
			loadGiveToUser();
		}
	}
}

function loadGiveToUser() {
	if (settings.pages.faction.banking_tools) {
		requireElement("#money-user").then(suggestBalance);
	}
}

function ocTimes(oc, format) {
	let crimes = doc.findAll(".organize-wrap .crimes-list>li");
	for (let crime of crimes) {
		let crime_id = crime.find(".details-wrap").getAttribute("data-crime");

		let finish_time;
		let span = doc.new({ type: "span", class: "tt-oc-time" });

		if (oc[crime_id]) {
			// noinspection JSUnresolvedVariable
			finish_time = oc[crime_id].time_ready;
			// noinspection JSUnusedLocalSymbols
			let [day, month, year, hours, minutes, seconds] = dateParts(new Date(finish_time * 1000));

			span.innerText = `${formatTime([hours, minutes, 0], format.time)} | ${formatDate([day, month, 0], format.date)}`;
		} else {
			span.innerText = "N/A";
		}

		crime.find(".status").appendChild(span);
	}
}

function subpage() {
	let hash = window.location.hash.replace("#/", "");
	if (hash === "" || hash.includes("war/")) {
		return "main";
	}

	if (getHashParameters().has("tab")) {
		return getHashParameters().get("tab");
	}

	return "";
}

function subpageLoaded(page) {
	switch (page) {
		case "crimes":
			return requireElement("#faction-crimes .organize-wrap ul.crimes-list li");
		case "main":
			return requireElement("#faction-main div[data-title='announcement']+div .ajax-placeholder", { invert: true });
		case "info":
			return requireElement("#faction-info .ajax-placeholder", { invert: true });
		case "upgrades":
			return requireElement("#faction-upgrades > .ajax-placeholder", { invert: true });
		default:
			return Promise.resolve();
	}
}

function openOCs() {
	for (let crime of doc.findAll(".organize-wrap .crimes-list > li")) {
		if (crime.find(".status .br") || crime.find(".status .bold").innerText.trim() !== "Ready") {
			continue;
		}

		let all_players_ready = true;
		for (let player of crime.findAll(".details-list>li")) {
			if (player.find(".member").innerText === "Member") continue;

			if (player.find(".stat").innerText !== "Okay") {
				all_players_ready = false;
				break;
			}
		}

		if (all_players_ready) {
			crime.classList.add("active");
		}
	}
}

function showNNB() {
	if (shouldDisable()) return;

	fetchApi_v2("tornstats", { action: "crimes" })
		.then((result) => {
			// Populate active crimes
			let crimes = doc.findAll(".organize-wrap .crimes-list>li");
			for (let crime of crimes) {
				for (let player of crime.findAll(".details-list>li")) {
					player.find(".level").classList.add("torntools-modified");
					if (mobile) {
						player.find(".member").classList.add("torntools-modified");
						player.find(".stat").classList.add("torntools-modified");
						player.find(".member").classList.add("torntools-mobile");
						player.find(".level").classList.add("torntools-mobile");
						player.find(".stat").classList.add("torntools-mobile");
					}

					if (player.find(".member").innerText === "Member") {
						let col = doc.new({
							type: "li",
							class: `tt-nnb ${mobile ? "torntools-mobile" : ""}`,
							text: mobile ? "NNB" : "TornStats NNB",
						});
						player.find(".stat").parentElement.insertBefore(col, player.find(".stat"));

						continue;
					}

					let player_id = player.find(".h").getAttribute("href").split("XID=")[1];
					// noinspection JSUnresolvedVariable
					let nnb = result.members[player_id] ? result.members[player_id].natural_nerve : "N/A";

					let col = doc.new({ type: "li", class: `tt-nnb ${mobile ? "torntools-mobile" : ""}`, text: nnb });
					player.find(".stat").parentElement.insertBefore(col, player.find(".stat"));
				}
			}

			// Populate new crime selection
			for (let player of doc.findAll(".plans-list .item")) {
				player.find(".offences").classList.add("torntools-modified");
				if (mobile) {
					player.find(".member").classList.add("torntools-modified");
					player.find(".level").classList.add("torntools-modified");
					player.find(".act").classList.add("torntools-modified");
					player.find(".member").classList.add("torntools-mobile");
					player.find(".level").classList.add("torntools-mobile");
					player.find(".act").classList.add("torntools-mobile");
					player.find(".offences").classList.add("torntools-mobile");
				}

				if (player.find(".member").innerText.trim() === "Member") {
					let col = doc.new({
						type: "li",
						class: `tt-nnb short ${mobile ? "torntools-mobile" : ""}`,
						text: mobile ? "NNB" : "TornStats NNB",
					});
					player.find(".act").parentElement.insertBefore(col, player.find(".act"));

					continue;
				}

				let player_id = player.find(".h").getAttribute("href").split("XID=")[1];
				// noinspection JSUnresolvedVariable
				let nnb = result.members[player_id] ? result.members[player_id].natural_nerve : "N/A";

				let col = doc.new({ type: "li", class: `tt-nnb short ${mobile ? "torntools-mobile" : ""}`, text: nnb });
				player.find(".act").parentElement.insertBefore(col, player.find(".act"));
			}

			doc.findAll(".doctorn-faction-nnb-value").forEach((node) => node.style.setProperty("display", "none", "important"));
		})
		.catch((err) => {
			console.log("ERROR", err);
		});
}

function fullInfoBox(page) {
	let info_box, facDescription;
	if (getSearchParameters().get("step") === "profile") {
		info_box = doc.find("#factions div[data-title='description']").nextElementSibling;
	} else if (page === "main") {
		info_box = doc.find("div[data-title='announcement']").nextElementSibling;
		facDescription = info_box;
	} else if (page === "info") {
		info_box = doc.find("#faction-info .faction-info-wrap.faction-description .faction-info");
	}

	if (!facDescription) facDescription = info_box.parentElement.find("div.faction-description");

	let title = info_box.previousElementSibling;

	if (title.classList.contains("tt-modified")) return;

	title.classList.add("title");
	title.classList.add("tt-modified");

	let key;
	if (page === "main") {
		key = "announcements_page_full";
	} else if (page === "info") {
		key = "info_page_full";
	}

	let options_div = doc.new({ type: "div", class: "tt-options" });

	let setting_div = doc.new({ type: "div", class: "tt-checkbox-wrap in-title" });
	let checkbox = doc.new({ type: "input", attributes: { type: "checkbox" } });
	let text = doc.new({ type: "div", text: "Show full page" });

	if (settings.pages.faction[key]) {
		checkbox.checked = true;
		facDescription.classList.toggle("tt-force-full");
	}

	setting_div.appendChild(checkbox);
	setting_div.appendChild(text);
	options_div.appendChild(setting_div);
	title.appendChild(options_div);

	checkbox.onclick = () => {
		facDescription.classList.toggle("tt-force-full");

		ttStorage.change({ settings: { pages: { faction: { [key]: checkbox.checked } } } });
	};
}

function upgradesInfoListener() {
	subpageLoaded("upgrades").then(() => {
		let upgrades_info_listener = new MutationObserver((mutations) => {
			for (let mutation of mutations) {
				if (mutation.type === "childList") {
					if (mutation.addedNodes[0]) {
						for (let added_node of mutation.addedNodes) {
							if (added_node.classList && added_node.classList.contains("confirm") && added_node.classList.length >= 3) {
								let available_respect = parseInt(doc.find(".residue-respect").innerText.replace(/,/g, ""));
								let required_respect;
								let needed_respect;

								for (let text of added_node.findAll(".text")) {
									if (text.innerText.indexOf("Requires:") > -1) {
										required_respect = parseInt(text.innerText.trim().split("Requires: ")[1].split(" respect")[0].replace(/,/g, ""));

										needed_respect = required_respect - available_respect;
										if (needed_respect < 0) needed_respect = 0;

										let span = doc.new({
											type: "span",
											text: ` (${numberWithCommas(needed_respect)} respect to go)`,
										});
										text.appendChild(span);
									}
								}
							}
						}
					}
				}
			}
		});
		upgrades_info_listener.observe(doc.find(".skill-tree"), { childList: true, subtree: true });
	});
}

function armoryWorth() {
	fetchApi_v2("torn", { section: "faction", selections: "weapons,armor,temporary,medical,drugs,boosters,cesium,currency" })
		.then((result) => {
			console.log("result", result);

			let total = 0;
			let lists = ["weapons", "armor", "temporary", "medical", "drugs", "boosters"];

			for (let type of lists) {
				if (result[type]) {
					for (let item of result[type]) {
						total += itemlist.items[item.ID].market_value * item.quantity;
					}
				}
			}

			// Points
			// noinspection JSUnresolvedVariable
			total += result.points * torndata.pawnshop.points_value;

			const li = doc.new({ type: "li" });
			const span = doc.new({ type: "span", text: "Armory value: ", class: "bold" });
			const spanValue = doc.new({ type: "span", text: `$${numberWithCommas(total, false)}` });
			li.appendChild(span);
			li.appendChild(spanValue);

			doc.find(".f-info-wrap .f-info.right").insertBefore(li, doc.find(".f-info-wrap .f-info.right>li:nth-of-type(2)"));
		})
		.catch((err) => {
			console.log("ERROR", err);

			if (err.error === "Incorrect ID-entity relation") {
				let li = doc.new({ type: "li", text: `Armory value: NO API ACCESS` });
				doc.find(".f-info-wrap .f-info.right").insertBefore(li, doc.find(".f-info-wrap .f-info.right>li:nth-of-type(2)"));
			}
		});
}

async function showUserInfo() {
	if (!settings.pages.faction.member_info && !(settings.scripts.stats_estimate.global && settings.scripts.stats_estimate.faction_members)) return;

	const factionId = doc.find(".faction-info-wrap .faction-info[data-faction]").getAttribute("data-faction");

	doc.find(".members-list .table-body").classList.add("tt-modified");

	let dataInformation;
	if (settings.pages.faction.member_info) {
		dataInformation = await new Promise((resolve) => {
			fetchApi_v2("torn", { section: "faction", objectid: factionId, selections: `${ownFaction ? "donations," : ""}basic` })
				.then((result) => resolve(result))
				.catch((result) => resolve(result));
		});
	}

	let estimateCount = 0;
	for (let tableRow of doc.findAll(".members-list .table-body > li")) {
		let userId = tableRow.find("a.user.name").getAttribute("data-placeholder")
			? tableRow.find("a.user.name").getAttribute("data-placeholder").split(" [")[1].split("]")[0]
			: tableRow.find("a.user.name").getAttribute("href").split("XID=")[1];

		const container = doc.new({ type: "section", class: "tt-userinfo-container" });
		tableRow.parentElement.insertBefore(container, tableRow.nextElementSibling);

		if (settings.pages.faction.member_info) {
			const row = doc.new({ type: "section", class: "tt-userinfo-row" });
			container.appendChild(row);

			if (!dataInformation.error) {
				// noinspection JSUnresolvedVariable
				let lastAction = (Date.now() - dataInformation.members[userId].last_action.timestamp * 1000) / 1000;
				if (lastAction < 0) lastAction = 0;

				// noinspection JSUnresolvedVariable
				row.appendChild(
					doc.new({
						type: "div",
						class: "tt-userinfo-field--last_action",
						text: `Last Action: ${dataInformation.members[userId].last_action.relative}`,
						attributes: { "last-action": lastAction.toFixed(0) },
					})
				);

				// noinspection JSUnresolvedVariable
				if (dataInformation.donations && dataInformation.donations[userId]) {
					// noinspection JSUnresolvedVariable
					if (dataInformation.donations[userId].money_balance > 0) {
						// noinspection JSUnresolvedVariable
						row.appendChild(
							doc.new({
								type: "div",
								text: `Money Balance: $${numberWithCommas(dataInformation.donations[userId].money_balance, false)}`,
							})
						);
					}
					// noinspection JSUnresolvedVariable
					if (dataInformation.donations[userId].points_balance > 0) {
						// noinspection JSUnresolvedVariable
						row.appendChild(
							doc.new({
								type: "div",
								text: `Point Balance: ${numberWithCommas(dataInformation.donations[userId].points_balance, false)}`,
							})
						);
					}
				}

				// Activity notifications
				const checkpoints = settings.inactivity_alerts_faction;
				for (let checkpoint of Object.keys(checkpoints).sort((a, b) => b - a)) {
					// noinspection JSUnresolvedVariable
					if (new Date() - new Date(dataInformation.members[userId].last_action.timestamp * 1000) >= parseInt(checkpoint)) {
						console.log(checkpoints[checkpoint]);
						tableRow.style.backgroundColor = `${checkpoints[checkpoint]}`;
						break;
					}
				}
			} else {
				let error = dataInformation.error;

				if (error === "Incorrect ID-entity relation") error = "No API access.";

				container.appendChild(
					doc.new({
						type: "div",
						class: "tt-userinfo-message",
						text: error,
						attributes: { color: "error" },
					})
				);
			}
		}

		if (settings.scripts.stats_estimate.global && settings.scripts.stats_estimate.faction_members) {
			const row = doc.new({ type: "section", class: "tt-userinfo-row" });
			container.appendChild(row);

			if (!hasCachedEstimate(userId)) estimateCount++;

			new MutationObserver(() => {
				container.style.display = tableRow.style.display === "none" ? "none" : "block";
			}).observe(tableRow, { attributes: true, attributeFilter: ["style"] });

			const level = parseInt(tableRow.find(".lvl").innerText);

			loadingPlaceholder(row, true);
			estimateStats(userId, false, estimateCount, level)
				.then((result) => {
					loadingPlaceholder(row, false);
					row.appendChild(
						doc.new({
							type: "span",
							text: `Stat Estimate: ${result.estimate}`,
						})
					);
				})
				.catch((error) => {
					loadingPlaceholder(row, false);

					if (error.show) {
						row.appendChild(
							doc.new({
								type: "span",
								class: "tt-userinfo-message",
								text: error.message,
								attributes: { color: "error" },
							})
						);
					} else {
						row.remove();
						if (container.children.length === 0) container.remove();
					}
				});
		}
	}
	member_info_added = true;
}

function showAvailablePlayers() {
	let count = 0;

	if (doc.find("div.plans-list.p10")) {
		display(count);
		return;
	}

	let list = doc.find("ul.plans-list");
	for (let member of list.findAll(":scope .item")) {
		count++;
	}

	display(count);

	function display(number) {
		doc.find("#faction-crimes").insertBefore(
			doc.new({
				type: "div",
				class: "info-msg-cont border-round m-top10 torn-msg",
				html: `
				<div class="info-msg border-round">
					<i class="info-icon"></i>
					<div class="delimiter">
						<div class="msg right-round">
							${number} member${number !== 1 ? "s" : ""} available for OCs.
						</div>
					</div>
				</div>
			`,
			}),
			doc.find("#faction-crimes").firstElementChild
		);
	}
}

function showRecommendedNNB() {
	const nnb_dict = {
		Blackmail: "0+",
		Kidnapping: "~20",
		"Bomb Threat": "~25",
		"Planned Robbery": "~35",
		"Rob a money train": "~45",
		"Take over a cruise liner": "~50",
		"Hijack a plane": "55-60",
		"Political Assassination": "~60",
	};

	const parent = doc.find(".faction-crimes-wrap .begin-wrap");

	const heading = parent.find(".plan-crimes[role=heading]");
	heading.appendChild(doc.new({ type: "span", class: "tt-span", text: mobile ? "NNB" : "Recommended NNB" }));

	for (let crime_type of parent.findAll(".crimes-list .item-wrap")) {
		let name_div = crime_type.find(".plan-crimes");
		let inner_span = doc.new({ type: "span", class: "tt-span", text: nnb_dict[name_div.innerText] });
		name_div.appendChild(inner_span);
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
        <!--suppress XmlDuplicatedId -->
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
            <div class="filter-wrap" id="status-filter">
                <div class="filter-heading">Status</div>
                <div class="filter-multi-wrap ${mobile ? "tt-mobile" : ""}">
                    <div class="tt-checkbox-wrap"><input type="checkbox" value="okay">Okay</div>
                    <div class="tt-checkbox-wrap"><input type="checkbox" value="hospital">Hospital</div>
                    <div class="tt-checkbox-wrap"><input type="checkbox" value="traveling">Traveling</div>
                    <div class="tt-checkbox-wrap"><input type="checkbox" value="jail">Jail</div>
                </div>
			</div>
			<div class="filter-wrap" id="special-filter">
				<div class="filter-heading">Special</div>
				<div class="filter-multi-wrap ${mobile ? "tt-mobile" : ""}">
					<div class="tt-checkbox-wrap">Y:<input type="checkbox" value="isfedded-yes">N:<input type="checkbox" value="isfedded-no">Fedded</div>
					<!-- <div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='traveling-yes'>N:<input type='checkbox' value='traveling-no'>Traveling</div> -->
					<div class="tt-checkbox-wrap">Y:<input type="checkbox" value="newplayer-yes">N:<input type="checkbox" value="newplayer-no">New Player</div>
					<div class="tt-checkbox-wrap">Y:<input type="checkbox" value="onwall-yes">N:<input type="checkbox" value="onwall-no">On Wall</div>
					<div class="tt-checkbox-wrap">Y:<input type="checkbox" value="incompany-yes">N:<input type="checkbox" value="incompany-no">In Company</div>
					<!-- <div class='tt-checkbox-wrap'>Y:<input type='checkbox' value='infaction-yes'>N:<input type='checkbox' value='infaction-no'>In Faction</div> -->
					<div class="tt-checkbox-wrap">Y:<input type="checkbox" value="isdonator-yes">N:<input type="checkbox" value="isdonator-no">Is Donator</div>
				</div>
			</div>
            <div class="filter-wrap" id="level-filter">
                <div class="filter-heading">Level</div>
                <div id="tt-level-filter" class="filter-slider"></div>
                <div class="filter-slider-info"></div>
            </div>
			<div class="filter-wrap" id="position-filter">
                <div class="filter-heading">Position</div>
                <select name="position" id="position-filter">
					<option value="None" selected>None</option>
				</select>
            </div>
            <div class="filter-wrap ${settings.pages.faction.member_info && ownFaction ? "" : "filter-hidden"}" id="last-action-filter">
                <div class="filter-heading">Last Action</div>
                <div id="tt-last-action-filter" class="filter-slider"></div>
                <div class="filter-slider-info"></div>
            </div>
        </div>
    `;

	// Initializing
	// let time_start = filters.faction.time[0] || 0;
	// let time_end = filters.faction.time[1] || 99999;
	let level_start = filters.faction.level[0] || 0;
	let level_end = filters.faction.level[1] || 100;
	let last_action_start = settings.pages.faction.member_info ? filters.faction.last_action[0] / 60 / 60 || 0 : 0;
	// let last_action_end = filters.faction.last_action[1] || 744;

	// for(let faction of filters.preset_data.factions.data){
	//     let option = doc.new({type: "option", value: faction, text: faction});
	//     if(faction == filters.preset_data.factions.default) option.selected = true;

	//     filter_container.find("#tt-faction-filter").appendChild(option);
	// }
	// let divider_option = doc.new({type: "option", value: "----------", text: "----------", attributes: {disabled: true}});
	// filter_container.find("#tt-faction-filter").appendChild(divider_option);

	// // Time slider
	// let time_slider = filter_container.find('#tt-time-filter');
	// noUiSlider.create(time_slider, {
	//     start: [time_start, time_end],
	//     step: 1,
	//     connect: true,
	//     range: {
	//         'min': 0,
	//         'max': 99999
	//     }
	// });

	// let time_slider_info = time_slider.nextElementSibling;
	// time_slider.noUiSlider.on('update', function (values) {
	//     values = values.map(x => parseInt(x));
	//     time_slider_info.innerHTML = `Days: ${values.join(' - ')}`;
	// });

	// Special
	for (let key in filters.faction.special) {
		switch (filters.faction.special[key]) {
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

	// Positions
	doc.findAll("#faction-info-members .table-body .position span").forEach((positionSpan) => {
		let filterContainerSelect = filter_container.find("#position-filter select");
		let position = positionSpan.innerText;
		if (!filterContainerSelect.innerHTML.includes(">" + position + "<"))
			filterContainerSelect.insertAdjacentHTML("beforeend", `<option value="${position}">${position}</option>`);
	});

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

	// Last Action slider
	let last_action_slider = filter_container.find("#tt-last-action-filter");
	noUiSlider.create(last_action_slider, {
		start: last_action_start,
		step: 1,
		connect: true,
		range: {
			min: 0,
			max: 744,
		},
	});

	let last_action_slider_info = last_action_slider.nextElementSibling;
	last_action_slider.noUiSlider.on("update", (values) => {
		values = values.map((x) => timeUntil(parseFloat(x) * 60 * 60 * 1000, { max_unit: "h", hide_nulls: true }));
		last_action_slider_info.innerHTML = `Min Hours: ${values.join(" - ")}`;
	});

	// Event listeners
	for (let checkbox of filter_container.findAll(".tt-checkbox-wrap input")) {
		checkbox.onclick = applyFilters;
	}
	for (let dropdown of filter_container.findAll("select")) {
		dropdown.onchange = applyFilters;
	}
	filter_container.find("#position-filter select").addEventListener("change", () => applyFilters());
	let filter_observer = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			// noinspection JSUnresolvedVariable
			if (
				mutation.type === "attributes" &&
				mutation.target.classList &&
				mutation.attributeName === "aria-valuenow" &&
				(mutation.target.classList.contains("noUi-handle-lower") || mutation.target.classList.contains("noUi-handle-upper"))
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
					populateFactions();
					applyFilters();
				});
			}, 300);
		}
	});

	// Initializing
	for (let state of filters.faction.activity) {
		doc.find(`#activity-filter input[value='${state}']`).checked = true;
	}
	for (let state of filters.faction.status) {
		doc.find(`#status-filter input[value='${state}']`).checked = true;
	}
	// if(filters.faction.faction.default){
	//     doc.find(`#faction-filter option[value='${filters.faction.faction}']`).selected = true;
	// }

	// populateFactions();
	if (settings.pages.faction.member_info) {
		memberInfoAdded().then(applyFilters);
	} else {
		applyFilters();
	}

	// Look for Search bar changes
	doc.find("#faction-info-members .table-header .table-cell.member input.search-input").addEventListener("keyup", () => {
		setTimeout(() => {
			for (let row of doc.findAll("#faction-info-members .table-body>.table-row")) {
				if (row.style.display === "none" && row.nextElementSibling && row.nextElementSibling.classList.contains("tt-user-info")) {
					row.classList.add("filter-hidden");
				} else if (
					(row.style.display === "flex" || row.style.display === "") &&
					row.nextElementSibling &&
					row.nextElementSibling.classList.contains("tt-user-info")
				) {
					row.classList.remove("filter-hidden");
				}
			}
		}, 100);
	});

	function applyFilters() {
		let activity = [];
		let status = [];
		let special = {};
		// let faction = ``;
		// let time = []
		let level = [];
		let last_action = [];

		// Activity
		for (let checkbox of doc.findAll("#activity-filter .tt-checkbox-wrap input:checked")) {
			activity.push(checkbox.getAttribute("value"));
		}
		// Status
		for (let checkbox of doc.findAll("#status-filter .tt-checkbox-wrap input:checked")) {
			status.push(checkbox.getAttribute("value"));
		}
		// Special
		for (let key in filters.faction.special) {
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
		// // Faction
		// faction = doc.find("#faction-filter select option:checked").value;
		// // Time
		// time.push(parseInt(doc.find("#time-filter .noUi-handle-lower").getAttribute("aria-valuenow")));
		// time.push(parseInt(doc.find("#time-filter .noUi-handle-upper").getAttribute("aria-valuenow")));
		// Level
		level.push(parseInt(doc.find("#level-filter .noUi-handle-lower").getAttribute("aria-valuenow")));
		level.push(parseInt(doc.find("#level-filter .noUi-handle-upper").getAttribute("aria-valuenow")));
		// Last Action
		last_action.push(parseInt(doc.find("#last-action-filter .noUi-handle-lower").getAttribute("aria-valuenow")) * 60 * 60); // convert to seconds
		// last_action.push(parseInt(doc.find("#last-action-filter .noUi-handle-upper").getAttribute("aria-valuenow"))*60*60);  // convert to seconds

		// console.log("Activity", activity);
		// console.log("Faction", faction);
		// console.log("Time", time);
		// console.log("Level", level);

		// Filtering
		for (let li of list.findAll(":scope > li.table-row")) {
			if (li.classList.contains("tt-user-info")) continue;
			showRow(li);

			// Level
			let player_level = parseInt(li.find(".lvl").innerText.trim());
			if (!(level[0] <= player_level && player_level <= level[1])) {
				showRow(li, false);
				continue;
			}

			// // Time
			// let player_time = parseInt(li.find(".days").innerText.trim().replace("Days:", "").trim());
			// if(!(time[0] <= player_time && player_time <= time[1])){
			//     li.classList.add("filter-hidden");
			//     continue;
			// }

			// Last Action
			if (settings.pages.faction.member_info && ownFaction) {
				let player_last_action = "N/A";
				if (
					li.nextElementSibling &&
					li.nextElementSibling.find(".tt-userinfo-field--last_action") &&
					li.nextElementSibling.find(".tt-userinfo-field--last_action").getAttribute("last-action")
				) {
					player_last_action = parseInt(li.nextElementSibling.find(".tt-userinfo-field--last_action").getAttribute("last-action"));
				}
				if (player_last_action !== "N/A" && !(last_action[0] <= player_last_action)) {
					showRow(li, false);
					continue;
				}
			}

			// Position
			if (filter_container.find("#position-filter select").value === "None") showRow(li);
			else if (
				filter_container.find("#position-filter select").value !== "None" &&
				filter_container.find("#position-filter select").value === li.find(".position").innerText
			)
				showRow(li);
			else if (
				filter_container.find("#position-filter select").value !== "None" &&
				filter_container.find("#position-filter select").value !== li.find(".position").innerText
			)
				showRow(li, false);

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

			// Status
			let matches_one_status = status.length === 0;
			for (let state of status) {
				if (li.find(`.status`).innerText.replace("Status:", "").trim().toLowerCase() === state) {
					matches_one_status = true;
				}
			}
			if (!matches_one_status) {
				showRow(li, false);
			}

			// Special
			for (let key in special) {
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
				faction: {
					activity: activity,
					// faction: faction,
					// time: time,
					special: special,
					status: status,
					level: level,
					last_action: last_action,
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
			) {
				row.nextElementSibling.classList.remove("filter-hidden");
			}
		} else {
			row.classList.add("filter-hidden");
			if (
				row.nextElementSibling &&
				(row.nextElementSibling.classList.contains("tt-user-info") || row.nextElementSibling.classList.contains("tt-userinfo-container"))
			) {
				row.nextElementSibling.classList.add("filter-hidden");
			}
		}
	}

	function updateStatistics() {
		const users = [...list.findAll(":scope>li:not(.tt-user-info)")];

		doc.find(".statistic#showing .filter-count").innerText = users.filter((x) => !x.classList.contains("filter-hidden")).length;
		doc.find(".statistic#showing .filter-total").innerText = users.length;
	}

	function populateFactions() {
		let faction_tags = [...list.findAll(":scope>li")]
			.map((x) => (x.find(".user.faction img") ? x.find(".user.faction img").getAttribute("title") : ""))
			.filter((x) => x !== "");

		for (let tag of faction_tags) {
			if (filter_container.find(`#tt-faction-filter option[value='${tag}']`)) continue;

			let option = doc.new({ type: "option", value: tag, text: tag });
			filter_container.find("#tt-faction-filter").appendChild(option);
		}
	}
}

function armoryFilter() {
	let armory_filter = content.newContainer("Armory Filter", {
		header_only: true,
		id: "ttArmoryFilter",
		next_element: doc.find("#faction-armoury-tabs"),
		all_rounded: true,
	});

	if (
		!["weapons", "armour"].includes(
			doc.find("ul[aria-label='Faction armoury tabs']>li[aria-selected='true']").getAttribute("aria-controls").replace("armoury-", "")
		)
	) {
		armory_filter.classList.add("filter-hidden");
	}

	// Switching page
	if (!mobile) {
		for (let link of doc.findAll("ul[aria-label='Faction armoury tabs']>li")) {
			if (["weapons", "armour"].includes(link.getAttribute("aria-controls").replace("armoury-", ""))) {
				link.addEventListener("click", () => {
					console.log("filter tab");
					if (doc.find("#ttArmoryFilter")) {
						doc.find("#ttArmoryFilter").classList.remove("filter-hidden");
					}
				});
			} else {
				link.addEventListener("click", () => {
					console.log("other tab");
					if (doc.find("#ttArmoryFilter")) {
						doc.find("#ttArmoryFilter").classList.add("filter-hidden");
					}
				});
			}
		}
	} else {
		doc.find(".armoury-drop-list select#armour-nav-list").addEventListener("change", () => {
			if (
				["weapons", "armour"].includes(
					doc.find("ul[aria-label='Faction armoury tabs']>li[aria-selected='true']").getAttribute("aria-controls").replace("armoury-", "")
				)
			) {
				console.log("filter tab");
				if (doc.find("#ttArmoryFilter")) {
					doc.find("#ttArmoryFilter").classList.remove("filter-hidden");
				}
			} else {
				console.log("other tab");
				if (doc.find("#ttArmoryFilter")) {
					doc.find("#ttArmoryFilter").classList.add("filter-hidden");
				}
			}
		});
	}

	let unavailable_wrap = doc.new({ type: "div", class: "tt-checkbox-wrap in-title hide-unavailable-option" });
	let unavailable_checkbox = doc.new({ type: "input", attributes: { type: "checkbox" } });
	let unavailable_text = doc.new({ type: "div", text: "Hide unavailable" });

	if (filters.faction_armory.hide_unavailable) {
		unavailable_checkbox.checked = filters.faction_armory.hide_unavailable;
	}

	unavailable_wrap.appendChild(unavailable_checkbox);
	unavailable_wrap.appendChild(unavailable_text);

	unavailable_checkbox.onclick = filter;

	armory_filter.find(".tt-options").appendChild(unavailable_wrap);

	armoryItemsLoaded().then(filter);

	let items_added_observer = new MutationObserver((mutations) => {
		for (let mutation of mutations) {
			if (mutation.type === "childList" && mutation.addedNodes[0]) {
				for (let added_node of mutation.addedNodes) {
					if (added_node.classList && added_node.classList.contains("item-list")) {
						if (
							["weapons", "armour"].includes(
								doc.find("ul[aria-label='Faction armoury tabs']>li[aria-selected='true']").getAttribute("aria-controls").replace("armoury-", "")
							)
						) {
							console.log("items added");
							filter();
						}
					}
				}
			}
		}
	});
	items_added_observer.observe(doc.find(`#faction-armoury-tabs`), { childList: true, subtree: true });

	function filter() {
		let item_list = doc.findAll(`#faction-armoury-tabs .armoury-tabs[aria-expanded='true'] .item-list>li`);
		let unavailable = doc.find(".hide-unavailable-option input").checked;

		for (let item of item_list) {
			item.classList.remove("filter-hidden");

			// Unavailable filter
			if (unavailable && item.find(".loaned a")) {
				item.classList.add("filter-hidden");
			}
		}

		ttStorage.change({ filters: { faction_armory: { hide_unavailable: unavailable } } });
	}
}

function armoryTabsLoaded() {
	return requireElement("ul[aria-label='Faction armoury tabs'] > li[aria-selected='true']");
}

function armoryItemsLoaded() {
	return requireElement("#faction-armoury-tabs .armoury-tabs[aria-expanded='true'] .item-list > li:not(.ajax-placeholder)");
}

function memberInfoAdded() {
	return new Promise((resolve) => {
		let checker = setInterval(() => {
			if (member_info_added) {
				resolve(true);
				return clearInterval(checker);
			}
		});
	});
}

function warOverviewLoaded() {
	return requireElement("#react-root ul.f-war-list");
}

function warDescriptionLoaded() {
	return requireElement("#war-react-root ul.f-war-list > li.descriptions");
}

function observeWarlist() {
	if (window.location.hash.includes("/war/")) warDescriptionLoaded().then(observeDescription);

	warOverviewLoaded().then(() => {
		new MutationObserver((mutations) => {
			let found = false;

			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					if (node.classList && node.classList.contains("descriptions")) {
						found = true;
						break;
					}
				}

				if (found) break;
			}

			if (!found) return;

			observeDescription();
		}).observe(doc.find("ul.f-war-list"), { childList: true });
	});
}

function observeDescription() {
	requireElement(".descriptions .members-list > li:not(.tt-userinfo-container)").then(() => {
		estimateStatsInList(".descriptions .members-list > li:not(.tt-userinfo-container)", (row) => {
			if (hasClass(row, "join") || hasClass(row, "timer-wrap")) {
				if (hasClass(row.nextElementSibling, "tt-userinfo-container")) row.nextElementSibling.remove();

				return {};
			}

			return {
				userId: (row.find("a.user.name").getAttribute("data-placeholder") || row.find("a.user.name > span").getAttribute("title")).match(
					/.* \[([0-9]*)]/i
				)[1],
				level: parseInt(row.find(".level").innerText),
			};
		});
	});

	requireElement("#war-react-root ul.f-war-list > li.descriptions ul.members-list").then(() => {
		new MutationObserver((mutations) => {
			let estimateCount = 0;

			for (let mutation of mutations) {
				for (let node of mutation.removedNodes) {
					if (hasClass(node, "your") || hasClass(node, "enemy")) {
						if (hasClass(mutation.nextSibling, "tt-userinfo-container")) {
							// noinspection JSUnresolvedFunction
							mutation.nextSibling.remove();
						}
					}
				}

				for (let node of mutation.addedNodes) {
					if (node && node.classList && (node.classList.contains("your") || node.classList.contains("enemy"))) {
						const userId = (
							node.find("a.user.name").getAttribute("data-placeholder") || node.find("a.user.name > span").getAttribute("title")
						).match(/.* \[([0-9]*)]/i)[1];
						const level = parseInt(node.find(".level").innerText);

						const container = doc.new({ type: "li", class: "tt-userinfo-container" });
						node.parentElement.insertBefore(container, node.nextElementSibling);

						const row = doc.new({ type: "section", class: "tt-userinfo-row tt-userinfo-row--statsestimate" });
						container.appendChild(row);

						if (!hasCachedEstimate(userId)) estimateCount++;

						loadingPlaceholder(row, true);
						estimateStats(userId, false, estimateCount, level)
							.then((result) => {
								loadingPlaceholder(row, false);
								row.appendChild(
									doc.new({
										type: "span",
										text: `Stat Estimate: ${result.estimate}`,
									})
								);
							})
							.catch((error) => {
								loadingPlaceholder(row, false);

								if (error.show) {
									row.appendChild(
										doc.new({
											type: "span",
											class: "tt-userinfo-message",
											text: error.message,
											attributes: { color: "error" },
										})
									);
								} else {
									row.remove();
									if (container.children.length === 0) container.remove();
								}
							});
					}
				}
			}
		}).observe(doc.find("#war-react-root ul.f-war-list > li.descriptions ul.members-list"), { childList: true });
	});
}

function highlightOwnOC() {
	// noinspection JSUnresolvedVariable
	const member = document.find(`.crimes-list > li.item-wrap .team > a[href="/profiles.php?XID=${userdata.player_id}"]`);
	if (!member) return;

	findParent(member, { class: "item-wrap" }).setAttribute("background-color", "green");
}

function suggestBalance() {
	const inputElement = doc.find("#money-user");
	["change", "paste", "keyup", "select", "focus", "input"].forEach((e) => inputElement.addEventListener(e, showBalance));
	doc.find("#money-user-cont").addEventListener("click", showBalance);
	showBalance();

	function showBalance() {
		const user = findUser();
		if (!user) {
			doc.find("label[for='money-user']").innerText = "Select player: ";
			return;
		}

		const name = user[1];
		const id = parseInt(user[2]);
		const balance = getBalance(id);

		doc.find("label[for='money-user']").innerText = `${name} has a balance of $${FORMATTER_NO_DECIMALS.format(balance)}`;
	}

	function findUser() {
		return doc.find("#money-user").value.match(/(.*) \[([0-9]*)]/i);
	}

	function getBalance(id) {
		return parseInt(doc.find(`.depositor .user.name[href='/profiles.php?XID=${id}']`).parentElement.find(".amount .money").getAttribute("data-value")) || 0;
	}
}

function displayWarOverTimes() {
	warOverviewLoaded().then(() => {
		doc.findAll("ul.f-war-list.war-new div.status-wrap div.timer").forEach((timer) => {
			if (!timer.parentElement.find("div.timer.tt-timer")) {
				let timerParts = timer.innerText.split(":").map((x) => parseInt(x));
				let time = timerParts[0] * 24 * 60 * 60 + timerParts[1] * 60 * 60 + timerParts[2] * 60 + timerParts[3];
				let overDate = formatDateObject(new Date(new Date().setSeconds(time)));
				let rawHTML = `<div class="timer tt-timer">${overDate.formattedTime} ${overDate.formattedDate}</div>`;
				timer.insertAdjacentHTML("afterend", rawHTML);
			}
		});
	});
}

function foldFactionDesc() {
	if (!doc.find("div[role='main'] i.tt-collapse-desc")) {
		let rawHTML = "<i class='tt-collapse-desc fas fa-caret-down' style='padding-top: 9px;padding-left: 7px;'></i>";
		doc.find("div[role='main'] div.tt-checkbox-wrap").insertAdjacentHTML("beforeend", rawHTML);
		doc.find("i.tt-collapse-desc").addEventListener("click", (event) => {
			event.target.classList.toggle("fa-caret-down");
			event.target.classList.toggle("fa-caret-right");
			let facDesc = doc.find("div[role='main'] div.cont-gray10");
			if (facDesc.style.display === "none") {
				facDesc.toggleAttribute("style");
			} else {
				facDesc.style.display = "none";
			}
			doc.find("div[role='main'] div.tt-options").parentElement.classList.toggle("active");
			doc.find("div[role='main'] div.tt-options").parentElement.classList.toggle("all-rounded");
		});
	}
}

function exportChallengeContributionsCSV() {
	requireElement("div#factions div#faction-upgrades div.body div#stu-confirmation").then(() => {
		let rawHTML = `<div id="ttContribExport" class="tt-title title-green">
                    <div class="title-text">Export Challenge Contributions</div>
					<div class="tt-options">
						<div id="ttExportButton" class="tt-option">
							<i class="fa fa-table"></i>
							<span class="text">CSV</span>
							<a id="ttExportLink"></a>
						</div>
					</div>
				</div>`;
		let contributionsObserver = new MutationObserver(() => {
			if (
				!doc.find("div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div#ttContribExport") &&
				doc.find("div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div.contributions-wrap")
			) {
				doc.find("div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div.contributions-wrap").insertAdjacentHTML(
					"beforebegin",
					rawHTML
				);
				doc.find(
					"div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div#ttContribExport div#ttExportButton"
				).addEventListener("click", () => {
					let upgradeName = doc.find(
						"div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div[role='alert'] div.name"
					).innerText;
					let totalTable = "data:text/csv;charset=utf-8," + "Number;Name;Profile Link;Ex Member;Contributions\r\n" + upgradeName + "\r\n";
					for (const memberLi of [
						...doc.findAll(
							"div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div.contributions-wrap ul.flexslides li:not(.slide)"
						),
					]) {
						let memberLabel = memberLi.find("div.player a").getAttribute("aria-label");
						if (memberLi.classList.contains("ex-member")) {
							totalTable +=
								memberLi.find("div.numb").innerText +
								";" +
								memberLabel.split(" ")[0] +
								";" +
								memberLi.find("div.player a").href +
								";" +
								"Yes;" +
								memberLabel.split(" ")[1].replace(/[()]/g, "") +
								"\r\n";
						} else {
							totalTable +=
								memberLi.find("div.numb").innerText +
								";" +
								memberLabel.split(" ")[0] +
								";" +
								memberLi.find("div.player a").href +
								";" +
								"No;" +
								memberLabel.split(" ")[1].replace(/[()]/g, "") +
								"\r\n";
						}
					}
					let encodedUri = encodeURI(totalTable);
					let ttExportLink = doc.find(
						"div#factions div#faction-upgrades div.body div#stu-confirmation div.description-wrap div#ttContribExport div#ttExportButton #ttExportLink"
					);
					ttExportLink.setAttribute("href", encodedUri);
					ttExportLink.setAttribute("download", `${upgradeName.replace(" ", "_")}_contributors.csv`);
					ttExportLink.click();
				});
			}
		});
		contributionsObserver.observe(doc.find("div#factions div#faction-upgrades div.body div#stu-confirmation"), { childList: true, subtree: true });
	});
}

function addNumbersToMembers() {
	doc.findAll("div#faction-info-members ul.table-body li.table-row").forEach((memberRow, memberIndex) =>
		memberRow.insertAdjacentHTML("afterbegin", `<span class="tt-member-index">${memberIndex + 1}</span>`)
	);
}
