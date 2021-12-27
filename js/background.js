chrome.runtime.onInstalled.addListener((details) => {
	reloadGAppsTabs();
});

function reloadGAppsTabs() {
	chrome.tabs.query({}, function(tabs) {
		for (let tab of tabs) {
			if ((tab.url || '').match(/(sites|docs|drive)\.google\.com\//i)) {
				chrome.tabs.reload(tab.id)
			}
		}
	});
}

;(function maybeBlockSheetsExternalRequests() {
	let filteringRequired = false;

	chrome.webRequest.onBeforeRequest.addListener(
		function(details) {
			if (!filteringRequired) return { cancel: false };

			let cancel = details.url.indexOf('externaldata/fetchData') != -1;
			return { cancel };
		},
		{
			urls: [
				'*://docs.google.com/spreadsheets/*',
				'*://docs.google.com/a/*/spreadsheets/*',
			],
		},
		[ 'blocking' ]
	);

	let configKeys = [
		'disableImageWebSearch',
		'disableImageAddByURL',
		'disableVideoWebSearch',
		'disableExplore',
		'disableSharing',
		'disableLinks',
		'disableDictionary',
		'disableComments',
		'disableGames',
		'disableSheetsExternalRequests',
	];

	chrome.storage.managed.get(configKeys, function(policySettings) {
		let hasSettings = Object.keys(policySettings).length > 0;
		let defaultValue = hasSettings ? false : true;

		let key = 'disableSheetsExternalRequests';

		if (key in policySettings) {
			filteringRequired = policySettings[key];
		} else {
			filteringRequired = defaultValue;
		}
	});
})();