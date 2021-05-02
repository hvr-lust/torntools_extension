requireDatabase().then(() => {
	requireContent().then(() => {
		console.log("TT - Quick items");
		if (shouldDisable()) return;

		injectXHR();

		if (settings.scripts.no_confirm.global && settings.scripts.no_confirm.item_equip) {
			addItemListener();
		}

		showXanaxWarning();
	});
});

// Torn functions
function getAction(obj) {
	obj.success = obj.success || (() => {});
	obj.before = obj.before || (() => {});
	obj.complete = obj.complete || (() => {});
	const url = obj.action || window.location.protocol + "//" + window.location.hostname + location.pathname;
	const options = {
		url: "https://www.torn.com/" + addRFC(url),
		type: obj.type || "get",
		data: obj.data || {},
		async: typeof obj.async !== "undefined" ? obj.async : true,
		success: (msg) => {
			console.log("success");
			obj.success(msg);
		},
		error: (xhr, ajaxOptions, thrownError) => {
			console.log("error", thrownError);
		},
	};
	if (options.data.step !== undefined) {
	}
	if (obj.file) {
		options.cache = false;
		options.contentType = false;
		options.processData = false;
	}
	return $.ajax(options);
}

function addItemListener() {
	const script = doc.new({ type: "script", attributes: { type: "text/javascript" } });

	const sendListener = `
		(xhr, body) => {
			if (!body || !body.includes("step=actionForm")) return body;
		
			const params = getParams(body);
			${
				settings.scripts.no_confirm.item_equip
					? `
				if (params.action === "equip" && confirm !== 1) {
					return paramsToBody({
						step: params.step,
						confirm: 1,
						action: params.action,
						id: params.id,
					});
				}
			`
					: ""
			}
	
			return body;
		}
	`;

	script.innerHTML = `
		(() => { 
			if (typeof xhrSendAdjustments === "undefined") xhrSendAdjustments = {};
			
			xhrSendAdjustments.noconfirm_items = ${sendListener}
		})();
	`;

	doc.find("head").appendChild(script);
}

function showXanaxWarning() {
	doc.addEventListener("click", (event) => {
		if (event.target.classList.contains("option-use") && event.target.getAttribute("aria-label") === "Take Xanax") {
			requireElement("div.action-wrap.use-act.use-action[style*='display: block'] span.bold").then(() => {
				let actionWrap = doc.find("div.action-wrap.use-act.use-action[style*='display: block']");
				if (
					actionWrap.find("span.bold").innerText.trim() === "Xanax" &&
					!actionWrap.find("span.tt-xan-warning") &&
					doc.find("a#barEnergy p[class*='bar-value_']").innerHTML.contains("1000/")
				) {
					actionWrap.find("h5#wai-action-desc").insertAdjacentHTML("afterend", "<span class='tt-xan-warning'>Warning ! You are at 1000E !</span>");
				}
			});
		}
	});
	if (doc.find("div#ttQuick div.item[item-id='206']") && doc.find("a#barEnergy p[class*='bar-value_']").innerHTML.contains("1000/")) {
		doc.find("div#ttQuick div.item[item-id='206']").style.backgroundColor = "#ff7979";
		doc.find("div#ttQuick div.item[item-id='206']").style.pointerEvents = "none";
	}
}
