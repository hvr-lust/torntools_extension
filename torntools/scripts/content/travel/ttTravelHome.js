// noinspection JSUnresolvedVariable

let hasMap;

requireDatabase().then(async () => {
	if (!doc.find(".content-wrapper .info-msg-cont").classList.contains("red") && doc.find(".travel-map")) {
		hasMap = true;
		mapLoaded().then(async () => {
			console.log("TT - Travel (home)");

			if (settings.pages.travel.cooldown_warnings) showCooldowns();

			doc.find("div.travel-agency:not([id])").addEventListener("click", (event) => {
				if (event.target.classList.contains("raceway") && event.target.hasAttribute("data-race") && event.target.getAttribute("role") === "button")
					addLandAndReturnTimes();
			});

			warnOnTimeout();
		});
	}
});

function mapLoaded() {
	return requireElement(".travel-map");
}

function showCooldowns() {
	requireElement("*[aria-hidden='false'] .travel-container.full-map").then(() => {
		display();

		for (let map of doc.findAll(".travel-container.full-map:not(.empty-tag)")) {
			new MutationObserver(() => {
				display();
			}).observe(map, { childList: true });
		}
	});

	function display() {
		if (!doc.find("*[aria-hidden='false'] .travel-container.full-map .flight-time")) return;

		const timer = doc.find("*[aria-hidden='false'] .travel-container.full-map .flight-time").innerText.split(" - ")[1].split(":");
		const duration = (parseInt(timer[0]) * 60 + parseInt(timer[1])) * 60 * 2;

		if (!doc.find("*[aria-hidden='false'] .tt-cooldowns")) {
			let travelContainer = doc.find("*[aria-hidden='false'] .travel-container.full-map");

			const cooldowns = doc.new({ type: "div", class: "tt-cooldowns" });

			cooldowns.innerHTML = `
				<div class="patter-left"></div>
				<div class="travel-wrap">
					<div class="cooldown energy ${getDurationClass(userdata.energy.fulltime)}">Energy</div>
					<div class="cooldown nerve ${getDurationClass(userdata.nerve.fulltime)}">Nerve</div>
					<div class="cooldown drug ${getDurationClass(userdata.cooldowns.drug)}">Drug</div>
					<div class="cooldown booster ${getDurationClass(userdata.cooldowns.booster)}">Booster</div>
					<div class="cooldown medical ${getDurationClass(userdata.cooldowns.medical)}">Medical</div>
				</div>
				<div class="patter-right"></div>
				<div class="clear"></div>
			`;

			travelContainer.parentElement.insertBefore(cooldowns, travelContainer);
		} else {
			handleClass(doc.find("*[aria-hidden='false'] .tt-cooldowns .cooldown.energy"), userdata.energy.fulltime);
			handleClass(doc.find("*[aria-hidden='false'] .tt-cooldowns .cooldown.nerve"), userdata.nerve.fulltime);
			handleClass(doc.find("*[aria-hidden='false'] .tt-cooldowns .cooldown.drug"), userdata.cooldowns.drug);
			handleClass(doc.find("*[aria-hidden='false'] .tt-cooldowns .cooldown.booster"), userdata.cooldowns.booster);
			handleClass(doc.find("*[aria-hidden='false'] .tt-cooldowns .cooldown.medical"), userdata.cooldowns.medical);
		}

		function getDurationClass(time) {
			return time < duration ? "waste" : "";
		}

		function handleClass(element, time) {
			const isWasted = time < duration;

			if (isWasted && !element.classList.contains("waste")) element.classList.add("waste");
			else if (!isWasted && element.classList.contains("waste")) element.classList.remove("waste");
		}
	}
}

function addLandAndReturnTimes() {
	let ttTimes = doc.find("span.tt-times");
	let travelTime = doc
		.find("div[role='tabpanel'][aria-hidden='false'] div.travel-container.full-map div.flight-time")
		.innerText.split("-")[1]
		.trim()
		.split(":")
		.map((x) => parseInt(x));
	let landDate = formatDateObject(new Date(new Date().setSeconds(travelTime[0] * 60 * 60 + travelTime[1] * 60)));
	let returnDate = formatDateObject(new Date(new Date().setSeconds(2 * travelTime[0] * 60 * 60 + 2 * travelTime[1] * 60)));
	if (ttTimes) {
		ttTimes.innerHTML = `Land at: ${landDate.formattedTime} ${landDate.formattedDate} | Return at: ${returnDate.formattedTime} ${returnDate.formattedDate}`;
	} else {
		doc.find("div.travel-agency:not([id])").insertAdjacentHTML(
			"afterend",
			`<span class="tt-times">Land at: ${landDate.formattedTime} ${landDate.formattedDate} | Return at: ${returnDate.formattedDate} ${returnDate.formattedTime}</span>`
		);
	}
}

function warnOnTimeout() {
	doc.addEventListener("click", (event) => {
		if (
			event.target.className.trim() === "torn-btn btn-dark-bg" &&
			doc.findAll("div.travel-confirm[style='display: block;']").length &&
			!doc.findAll("div.travel-agency div[id*='tab4'][aria-hidden='false'] div#tt-timeout-warning").length
		) {
			let travelTimeArray = doc.findAll("div.travel-confirm[style='display: block;'] span.bold.white")[1].innerText.split(" ");
			let travelTime;
			if (travelTimeArray.length === 2) {
				travelTime = travelTimeArray[0] * 60;
			} else if (travelTimeArray.length === 5) {
				travelTime = travelTimeArray[0] * 60 * 60 + travelTimeArray[3] * 60;
			}
			let timeoutFor;
			if (
				userdata.education_timeleft &&
				userdata.city_bank.time_left &&
				2 * travelTime >= userdata.education_timeleft &&
				2 * travelTime >= userdata.city_bank.time_left
			) {
				timeoutFor = "education course and bank investment end";
			} else if (userdata.education_timeleft && 2 * travelTime >= userdata.education_timeleft) {
				timeoutFor = "education course ends";
			} else if (userdata.city_bank.time_left && 2 * travelTime >= userdata.city_bank.time_left) {
				timeoutFor = "bank investment ends";
			} else {
				return;
			}
			let rawHTML = `<div id="tt-timeout-warning">
			<div class="patter-left"></div>
			<div class="travel-wrap">
				<span>Warning: Your ${timeoutFor} before you return to TORN !</span>
			</div>
			<div class="patter-right"></div>
			<div class="clear"></div>
		</div>`;
			doc.find("div.travel-agency div.travel-container.full-map[style='display: block;']").insertAdjacentHTML("beforebegin", rawHTML);
		}
	});
}
