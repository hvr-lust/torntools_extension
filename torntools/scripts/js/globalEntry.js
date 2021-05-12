console.log("TT - Loading global entry.");

let mobile = false;
let page_status;

function mobileChecker() {
	return new Promise((resolve) => {
		if (!window.location.host.includes("torn") || getCurrentPage() === "api") {
			resolve(false);
			return;
		}

		if (document.readyState === "complete" || document.readyState === "loaded") check();
		else window.addEventListener("DOMContentLoaded", check);

		function check() {
			const browserWidth = window.innerWidth;

			if (browserWidth <= 600) resolve(true);
			else resolve(false);
		}
	});
}

ttStorage.get(["settings"], async ([settings]) => {
	// Hide chats
	document.documentElement.style.setProperty(`--torntools-hide-chat`, settings.pages.global.hide_chat ? "none" : "block");

	// Mobile
	mobile = await mobileChecker();
	console.log("Using mobile:", mobile);

	// Page status
	page_status = await getPageStatus();
	console.log("Page Status:", page_status);

	if (database_status === DATABASE_STATUSES.LOADING) {
		database_status = DATABASE_STATUSES.LOADING_ENTRY;
	} else {
		database_status = DATABASE_STATUSES.ENTRY;
	}
});
