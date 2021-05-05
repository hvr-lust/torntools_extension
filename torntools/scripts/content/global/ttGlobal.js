requireDatabase().then(() => {
	console.log("Loading Global Script");

	// Add TT Black overlay
	doc.find("body").appendChild(doc.new({ type: "div", class: "tt-black-overlay" }));

	if (settings.scripts.no_confirm.revives) {
		injectXHR();

		addReviveListener();
	}

	if (settings.pages.global.show_toggle_chat) {
		showToggleChat();
	}

	aliasUsers();

	requireNavbar().then(async () => {
		// Mark Body with Mobile class
		if (mobile) doc.find("body").classList.add("tt-mobile");

		// Create a section in Information tab for future info added
		if (!mobile) addInformationSection();

		// Vault balance
		if (settings.pages.global.vault_balance && !mobile) {
			displayVaultBalance();
		}

		// Links for Energy and Nerve
		if (!mobile) {
			doc.find("#barEnergy [class*='bar-name_']").classList.add("tt-text-link");
			doc.find("#barNerve [class*='bar-name_']").classList.add("tt-text-link");
			doc.find("#barEnergy [class*='bar-name_']").onclick = () => {
				window.location.href = "https://www.torn.com/gym.php";
			};
			doc.find("#barNerve [class*='bar-name_']").onclick = () => {
				window.location.href = "https://www.torn.com/crimes.php";
			};
		}

		// NUKE REVIVE SCRIPT
		if (settings.pages.global.enable_central_revive) nukeReviveScript();

		// Global time reducer
		setInterval(() => {
			for (let time of doc.findAll("*[seconds-down]")) {
				let seconds = parseInt(time.getAttribute("seconds-down"));
				seconds--;

				if (seconds <= 0) {
					time.removeAttribute("seconds-down");
					time.innerText = "Ready";
					continue;
				}

				time.innerText = timeUntil(seconds * 1000);
				time.setAttribute("seconds-down", seconds);
			}
		}, 1000);

		// Update time increaser
		setInterval(() => {
			for (let time of doc.findAll("*[seconds-up]")) {
				let seconds = parseInt(time.getAttribute("seconds-up"));
				seconds++;

				time.innerText = timeUntil(seconds * 1000);
				time.setAttribute("seconds-up", seconds);
			}
		}, 1000);

		// noinspection JSUnresolvedVariable
		if (userdata.faction.faction_id && settings.pages.global.highlight_chain_timer && settings.pages.global.highlight_chain_length >= 10)
			chainTimerHighlight();

		if (settings.pages.profile.show_chain_warning) {
			let miniProfilesObserver = new MutationObserver(chainBonusWatch);
			miniProfilesObserver.observe(doc.body, { childList: true });
			chainBonusWatch();
		}

		if (settings.pages.global.show_settings_areas_link && !mobile) ttSettingsLink();

		if (settings.pages.global.npc_loot_info && !mobile) showNpcLoot();

		upkeepMoreThan();
	});

	chatsLoaded().then(() => {
		if (shouldDisable()) return;

		// Chat highlight
		if (doc.find(".chat-box-content_2C5UJ .overview_1MoPG .message_oP8oM")) {
			if (Object.keys(users_alias).length) aliasUsersChat();
		}

		doc.addEventListener("click", (event) => {
			if (!hasParent(event.target, { class: "chat-box_Wjbn9" })) {
				return;
			}

			if (Object.keys(users_alias).length) aliasUsersChat();
		});

		let chat_observer = new MutationObserver((mutationsList) => {
			for (let mutation of mutationsList) {
				// noinspection JSUnresolvedVariable
				if (mutation.addedNodes[0] && mutation.addedNodes[0].classList && mutation.addedNodes[0].classList.contains("message_oP8oM")) {
					let message = mutation.addedNodes[0];

					if (Object.keys(users_alias).length) aliasUsersChat(message);
				}
			}
		});
		chat_observer.observe(doc.find("#chatRoot"), { childList: true, subtree: true });
	});
});

function chatsLoaded() {
	return requireElement(".overview_1MoPG");
}

function displayVaultBalance() {
	if (!networth || !networth.current || !networth.current.value) return;

	let money = networth.current.value.vault;

	if (settings.pages.global.vault_balance_own && vault.initialized && vault.user.current_money) {
		money = vault.user.current_money;
	}

	let elementHTML = `
    	<span class="bold">Vault:</span>
    	<span class="money-color">
			${settings.pages.global.vault_balance_own && vault.initialized && vault.user.current_money ? "*" : ""}$${numberWithCommas(money, false)}
		</span>
    `;

	let el = doc.new({ type: "p", class: "tt-point-block", attributes: { tabindex: "1" }, html: elementHTML });

	let info_cont = doc.find("h2=Information");
	info_cont.parentElement
		.find("[class*='points_']")
		.insertBefore(el, info_cont.parentElement.find("[class*='points_'] [class*='point-block_']:nth-of-type(2)"));
}

function showToggleChat() {
	const icon = doc.new({
		id: "tt-hide_chat",
		type: "i",
		class: `fas ${settings.pages.global.hide_chat ? "fa-comment" : "fa-comment-slash"}`,
	});

	icon.addEventListener("click", () => {
		settings.pages.global.hide_chat = !settings.pages.global.hide_chat;

		if (settings.pages.global.hide_chat) {
			icon.classList.remove("fa-comment-slash");
			icon.classList.add("fa-comment");
		} else {
			icon.classList.add("fa-comment-slash");
			icon.classList.remove("fa-comment");
		}

		document.documentElement.style.setProperty(`--torntools-hide-chat`, settings.pages.global.hide_chat ? "none" : "block");

		ttStorage.set({ settings: settings });
	});

	function setToggleChatPosition() {
		const maxTop =
			Array.from(document.querySelectorAll("#chatRoot > div > div")).reduce((accumulator, currentValue) =>
				Math.max(accumulator || 0, currentValue.style["top"].replace(/[^\d]/g, ""))
			) || 0;
		const iconBottom = (maxTop / 39 / 2 + 1) * 39;

		icon.style["bottom"] = `${iconBottom}px`;
	}

	new MutationObserver(() => setToggleChatPosition()).observe(document.querySelector("#chatRoot > div"), { attributes: true, subtree: true });

	doc.find("#body").prepend(icon);

	setToggleChatPosition();
}

function addInformationSection() {
	let hr = doc.new({ type: "hr", class: "delimiter___neME6 delimiter___3kh4j tt-information-section-hr" }); // FIXME - Use right classes.
	let div = doc.new({ type: "div", class: "tt-information-section" });

	doc.find("#sidebarroot [class*='user-information_'] [class*='content_']:not([class*='toggle-'])").appendChild(hr);
	doc.find("#sidebarroot [class*='user-information_'] [class*='content_']:not([class*='toggle-'])").appendChild(div);
}

function addReviveListener() {
	const script = doc.new({
		type: "script",
		attributes: { type: "text/javascript" },
	});

	const reviveHandler = `
		(xhr, method, url) => {
			if (url.includes("action=revive") && !url.includes("step=revive")) {
				url = url + "&step=revive";
			}
			
			return { method, url };
		}
	`;

	script.innerHTML = `
		(() => { 
			if (typeof xhrOpenAdjustments === "undefined") xhrOpenAdjustments = {};
			
			xhrOpenAdjustments.noconfirm_revives = ${reviveHandler}
		})();
	`;

	doc.find("head").appendChild(script);
}

function nukeReviveScript() {
	// HTML - taken from Jox's script 'Central Hospital Revive Request'
	const reviveButtonHTML = `
<div id="top-page-links-list" class="content-title-links" role="list" aria-labelledby="top-page-links-button">
	<a role="button" aria-labelledby="nuke-revive" class="nuke-revive t-clear h c-pointer  m-icon line-h24 right last" href="#" style="padding-left: 10px; padding-right: 10px" id="nuke-revive-link">
		<span class="icon-wrap svg-icon-wrap">
			<span class="link-icon-svg nuke-revive">
			<div id="cf"></div>
			</span>
		</span>
		<span id="nuke-revive" style="color:red">Revive Me</span>
	</a>
</div>
	`;
	const reviveButton = doc.new({ type: "span" });
	reviveButton.innerHTML = reviveButtonHTML;

	// Add button to page - taken from Jox's script 'Central Hospital Revive Request'
	if (!doc.find("#nuke-revive-link")) {
		let linkReference =
			doc.find(".links-footer") ||
			doc.find(".content-title .clear") ||
			doc.find(".tutorial-switcher") ||
			doc.find(".links-top-wrap") ||
			doc.find(".forums-main-wrap");
		if (linkReference) {
			let linkContainer = linkReference.parentNode;
			linkContainer.insertBefore(reviveButton, linkReference);

			doc.find("#nuke-revive-link").onclick = () => {
				callForRevive();
			};
		}
	}

	function callForRevive() {
		// noinspection JSUnresolvedVariable
		const playerID = userdata.player_id;
		const playerName = userdata.name;
		const isInHospital = !!doc.find("#sidebarroot [class*='status-icons_'] li[class*=icon15]");
		// noinspection JSUnresolvedVariable
		const faction = userdata.faction.faction_name;
		// noinspection JSUnresolvedVariable,JSUnresolvedFunction
		const appInfo = `TornTools v${chrome.runtime.getManifest().version}`;
		let country = document.body.dataset.country;

		switch (country) {
			case "uk":
				country = "United Kingdom";
				break;
			case "uae":
				country = "UAE";
				break;
			default:
				country = country.replace(/-/g, " ");
				country = capitalize(country, true);
				break;
		}

		if (!isInHospital) {
			alert("You are not in hospital.");
			return;
		}

		const postData = { uid: playerID, Player: playerName, Faction: faction, Country: country, AppInfo: appInfo };
		fetchRelay("nukefamily", {
			section: "dev/reviveme.php",
			method: "POST",
			postData: postData,
		}).then(async (response) => {
			console.log("response", response);
		});
	}
}

function chainTimerHighlight() {
	let blinkIntervalId;
	let chainObserver = new MutationObserver(() => {
		if (doc.find("a#barChain [class^='bar-value_']").innerText.split("/")[1] >= settings.pages.global.highlight_chain_length) {
			let chainTimerParts = doc.find("a#barChain [class^='bar-timeleft_']").innerHTML.split(":");
			let chainTimer = parseInt(chainTimerParts[0]) * 60 + parseInt(chainTimerParts[1]);
			if (chainTimer === 0 || chainTimer > 60) clearInterval(blinkIntervalId);
			if (blinkIntervalId) return;
			if (chainTimer !== 0 && chainTimer < 60) blinkIntervalId = setInterval(() => doc.find("a#barChain").classList.toggle("tt-blink"), 700);
		}
	});
	chainObserver.observe(doc.find("a#barChain [class^='bar-value_']"), { characterData: true });
}

function chainBonusWatch() {
	doc.findAll(".profile-button-attack[aria-label*='Attack']").forEach((attackButton) => {
		if (!attackButton.classList.contains("tt-mouseenter")) {
			attackButton.classList.add("tt-mouseenter");
			attackButton.addEventListener("mouseenter", () => {
				let chainParts = doc.find("a#barChain [class^='bar-value_']").innerText.split("/");
				if (!doc.find(".tt-fac-chain-bonus-warning") && chainParts[0] > 10 && chainParts[1] - chainParts[0] < 20) {
					let rawHTML = `<div class="tt-fac-chain-bonus-warning">
						<div>
							<span>Chain is approaching bonus hit ! Please check your faction chat !</span>
						</div>
					</div>`;
					doc.body.insertAdjacentHTML("afterbegin", rawHTML);
				}
			});
			attackButton.addEventListener("mouseleave", () => {
				if (doc.find(".tt-fac-chain-bonus-warning")) doc.find("div.tt-fac-chain-bonus-warning").remove();
			});
		}
	});
}

function ttSettingsLink() {
	// noinspection JSUnresolvedVariable,JSUnresolvedFunction
	doc.find("div.areasWrapper [class*='toggle-content__']").appendChild(
		navbar.newAreasLink({
			id: "tt-nav-settings",
			href: "/home.php#TornTools",
			svgHTML: `<img src="${chrome.runtime.getURL("images/icongrey48.png")}" alt="icon" style="height: 21px;">`,
			linkName: "TornTools Settings",
		})
	);
}

function aliasUsers() {
	requireElement(".m-hide a[href*='/profiles.php?XID=']").then(() => {
		for (const userID of Object.keys(users_alias)) {
			doc.findAll(`.m-hide a[href*='/profiles.php?XID=${userID}']`).forEach((userIdA) => {
				userIdA.classList.add("tt-user-alias");
				userIdA.insertAdjacentHTML("beforeend", `<div class='tt-alias'>${users_alias[userID]}</div>`);
			});
		}
	});
}

function aliasUsersChat(message = "") {
	if (message) {
		let profileA = message.find(`a[href*='/profiles.php?XID=']`);
		let messageUserId = profileA.href.split("=")[1];
		if (Object.keys(users_alias).includes(messageUserId)) profileA.innerText = users_alias[messageUserId] + ": ";
	} else {
		for (const userID of Object.keys(users_alias)) {
			doc.findAll(`#chatRoot a[href*='/profiles.php?XID=${userID}']`).forEach((profileA) => {
				let messageUserId = profileA.href.split("=")[1];
				profileA.innerText = users_alias[messageUserId] + ": ";
			});
		}
	}
}

function upkeepMoreThan() {
	if (-networth.current.value.unpaidfees >= settings.pages.global.upkeep_more_than) {
		doc.find("#sidebarroot #nav-properties").classList.add("tt-upkeep");
		if (isDarkMode()) {
			doc.find("#sidebarroot #nav-properties svg").setAttribute("fill", "url(#sidebar_svg_gradient_regular_green_mobile)");
		} else if (!isDarkMode() && mobile) {
			doc.find("#sidebarroot #nav-properties svg").setAttribute("fill", "url(#sidebar_svg_gradient_regular_green_mobile)");
		} else {
			doc.find("#sidebarroot #nav-properties svg").setAttribute("fill", "url(#sidebar_svg_gradient_regular_desktop_green)");
		}
	}
}

function showNpcLoot() {
	let npcLootDiv = navbar.newSection("NPCs");
	let npcContent = npcLootDiv.find(".tt-content");
	for (const npcID of Object.keys(loot_times)) {
		let npcData = loot_times[npcID];
		let npcDiv = doc.new({ type: "div", class: "tt-npc" });
		let npcSubDiv = doc.new({ type: "div", class: "tt-npc-information" });
		let npcName = doc.new({
			type: "a",
			class: "tt-npc-name",
			href: `https://www.torn.com/profiles.php?XID=${npcID}`,
			html: `${npcData.name} [${npcID}]:<br>`,
		});
		let npcStatus;
		let npcInHosp = false;
		if (npcData.hospout * 1000 > Date.now()) {
			npcInHosp = true;
			npcStatus = doc.new({ type: "span", class: "hosp", text: "Hosp" });
		} else {
			npcStatus = doc.new({ type: "span", class: "okay", text: "Okay" });
		}
		let npcLootLevel, npcNextLevelIn;
		if (npcInHosp) {
			let hospOutIn = npcData.hospout * 1000 - Date.now();
			npcLootLevel = doc.new({ type: "span", class: "loot", text: "0" });
			npcNextLevelIn = doc.new({ type: "span", text: timeUntil(hospOutIn), attributes: { seconds: Math.floor(hospOutIn / 1000) } });
		} else {
			for (let lootLevel in npcData.timings) {
				lootLevel = parseInt(lootLevel);
				let nextLvlTime = npcData.timings[lootLevel].ts * 1000 - Date.now();
				if (nextLvlTime > 0) {
					npcLootLevel = doc.new({ type: "span", class: "loot", text: lootLevel - 1 });
					npcNextLevelIn = doc.new({ type: "span", text: timeUntil(nextLvlTime), attributes: { seconds: Math.floor(nextLvlTime / 1000) } });
					break;
				} else if (lootLevel !== 5 && nextLvlTime < 0) {
				} else if (lootLevel === 5 && nextLvlTime < 0) {
					npcNextLevelIn = doc.new({ type: "span", text: "Max Level Reached" });
				}
			}
		}
		npcDiv.appendChild(npcName);
		npcSubDiv.appendChild(npcStatus);
		npcSubDiv.appendChild(doc.new({ type: "span", text: " / " }));
		npcSubDiv.appendChild(npcLootLevel);
		npcSubDiv.appendChild(doc.new({ type: "span", text: " / " }));
		npcSubDiv.appendChild(npcNextLevelIn);
		npcDiv.appendChild(npcSubDiv);
		npcContent.appendChild(npcDiv);
	}
	npcContent.id = "tt-loot";
	doc.find("#sidebar > :first-child").insertAdjacentElement("afterend", npcLootDiv);
	setInterval(() => {
		doc.findAll("div#tt-loot .tt-npc .tt-npc-information > :last-child").forEach((x) => {
			if (!x.getAttribute("seconds")) return;
			let secondsLeft = x.getAttribute("seconds");
			x.setAttribute("seconds", secondsLeft - 1);
			x.innerText = timeUntil((secondsLeft - 1) * 1000);
		});
	}, 1000);
}
