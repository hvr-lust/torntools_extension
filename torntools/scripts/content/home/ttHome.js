requireDatabase().then(() => {
	requireContent().then(async () => {
		console.log("TT - Home");

		if (window.location.hash.includes("TornTools")) {
			// noinspection JSUnresolvedVariable,JSUnresolvedFunction
			let ttIframeHTML = `<iframe id="ttIframe" src="${chrome.runtime.getURL("views/settings/settings.html")}"></iframe>`;
			doc.find("div#sidebarroot").classList.add("tt-modified");
			doc.find("div.content-wrapper div.content").style.display = "none";
			doc.find("div.content-wrapper div.content").insertAdjacentHTML("beforebegin", ttIframeHTML);
			// noinspection HtmlUnknownTarget
			doc.find("a[role='button'].activity-log").insertAdjacentHTML(
				"afterend",
				`<a id="tt-back-to-torn" class="back t-clear h c-pointer line-h24 right" href="/index.php">
				<span class="icon-wrap svg-icon-wrap">
					<span class="link-icon-svg back ">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 13"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g><g class="cls-1"><path class="cls-2" d="M16,13S14.22,4.41,6.42,4.41V1L0,6.7l6.42,5.9V8.75c4.24,0,7.37.38,9.58,4.25"></path></g><path class="cls-3" d="M16,12S14.22,3.41,6.42,3.41V0L0,5.7l6.42,5.9V7.75c4.24,0,7.37.38,9.58,4.25"></path></g></g></svg>
					</span>
				</span>
				<span id="back">Back to TORN</span>
			</a>`
			);
		}
	});
});
