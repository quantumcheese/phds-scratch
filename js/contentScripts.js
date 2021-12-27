class Config {
	static load () {
		return new Promise((res, rej) => {
			chrome.storage.managed.get(Config.keys, function(policySettings) {
				let hasSettings = Object.keys(policySettings).length > 0;
				let defaultValue = hasSettings ? false : true;

				for (let key of Config.keys) {
					if (key in policySettings) {
						Config[key] = policySettings[key];
					} else {
						Config[key] = defaultValue;
					}
				}

				res();
			});
		});
	}

	static print () {
		const activeStyle = 'background: #393; color: #fff;';
		const inactiveStyle = 'color: #999;';
		let lines = [ '%cHiding Scratch Features configuration%c\n' ];
		let styles = [ 'color:#000; background:#EDCD38;', '' ];

		for (let key of Config.keys) {
			let active = Config[key];
			lines.push(`${key}: %c${active ? 'active' : 'inactive'}%c`);
			styles.push(active ? activeStyle : inactiveStyle);
			styles.push('');
		}

		lines.push('\nThese settings are configurable via policies: http://www.chromium.org/administrators/configuring-policy-for-extensions');

		console.log(lines.join('\n'), ...styles);
	}
}

Config.keys = [
	'disableTutorials',
	'disableSprites'
];


class Helpers {
	static addCss (cssString) {
		if (!Helpers._styleSheets) Helpers._styleSheets = [
			'/* hide-scratch-features extension */'
		];
		Helpers._styleSheets.push(cssString);
	}

	static applyStylesheets () {
		if (!Helpers._styleSheets) return;

		let head = document.head || document.getElementsByTagName('head')[0];
		let style = document.createElement('style');

		style.type = 'text/css';
		style.appendChild(document.createTextNode(Helpers._styleSheets.join('\n')));
		head.appendChild(style);

		Helpers._styleSheets = null;
	}

	static get isTopFrame () {
		return window.top == window.self;
	}

	static click (elm) {
		Helpers._triggerMouseEvent(elm, "mouseover");
		Helpers._triggerMouseEvent(elm, "mousedown");
		Helpers._triggerMouseEvent(elm, "mouseup");
		Helpers._triggerMouseEvent(elm, "click");
	}

	static _triggerMouseEvent (node, eventType) {
		var clickEvent = document.createEvent('MouseEvents');
		clickEvent.initEvent(eventType, true, true);
		node.dispatchEvent(clickEvent);
	}

	static removeNode(domNode) {
		// console.log('removing', domNode.textContent, domNode.className);
		domNode.parentNode.removeChild(domNode);
	}

	static maybeRemoveSeparator(domNode, before, after) {
		if (before && domNode.previousElementSibling
			&& domNode.previousElementSibling.className.match('separator')
		) Helpers.removeNode(domNode.previousElementSibling);

		if (after && domNode.nextElementSibling
			&& domNode.nextElementSibling.className.match('separator')
		) Helpers.removeNode(domNode.nextElementSibling);
	}

	//context or toolbar menus are appended directly to the body as needed
	static watchForBodyAppends(callback) {
		if (!Helpers._domChangeWatcher) {
			Helpers._domChangeWatcher = new DOMChangeWatcher();
		}

		Helpers._domChangeWatcher.addBodyCallback(callback);
	}

	// use this for menus whose contents change
	static watchForContextMenuChanges(callback) {
		if (!Helpers._domChangeWatcher) {
			Helpers._domChangeWatcher = new DOMChangeWatcher();
		}

		Helpers._domChangeWatcher.addContextMenuCallback(callback);
	}
}


class DOMChangeWatcher {
	constructor () {
		this._menuObservers = new Map();
		this._bodyWatches = [];
		this._contextMenuWatches = [];

		let observer = new MutationObserver((mutationsList) => {
			for (let callback of this._bodyWatches) callback(mutationsList);
			for (let callback of this._contextMenuWatches) callback(mutationsList);

			for (let menu of document.querySelectorAll('body > .goog-menu')) {
				if (this._menuObservers.has(menu)) continue;
				
				let menuObserver = new MutationObserver((mutationsList) => {
					for (let callback of this._contextMenuWatches) callback(mutationsList);
				});
				menuObserver.observe(menu, { childList: true, subtree: true });

				this._menuObservers.set(menu, menuObserver);
			}
		});

		observer.observe(document.body, { childList: true });
	}

	addBodyCallback(callback) {
		this._bodyWatches.push(callback);
	}

	addContextMenuCallback(callback) {
		this._contextMenuWatches.push(callback);
	}
}


class HotkeyInterceptor {
	static hook (domDocument) {
		if (!HotkeyInterceptor._combos) HotkeyInterceptor._combos = [];

		domDocument.addEventListener(
			'keydown',
			HotkeyInterceptor._interceptFunction.bind(HotkeyInterceptor),
			true
		);

		domDocument.addEventListener(
			'keyup',
			HotkeyInterceptor._interceptFunction.bind(HotkeyInterceptor),
			true
		);
	}

	static add (keyCombo) {
		if (!HotkeyInterceptor._combos) HotkeyInterceptor._combos = [];

		let combo = {
			name: keyCombo,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
		};

		let keys = keyCombo.toLowerCase().split('+');
		for (let key of keys) {
			if (key == 'ctrl') combo.ctrlKey = true;
			else if (key == 'alt') combo.altKey = true;
			else if (key == 'shift') combo.shiftKey = true;
			else {
				combo.key = key;
			}
		}

		HotkeyInterceptor._combos.push(combo);
	}

	static _interceptFunction (e) {
		for (let combo of HotkeyInterceptor._combos) {
			if (
				combo.ctrlKey == e.ctrlKey &&
				combo.altKey == e.altKey &&
				combo.shiftKey == e.shiftKey &&
				combo.key == e.key.toLowerCase()
			) {
				console.log('Prevented:', combo.name);
				e.preventDefault();
				e.stopPropagation();
				return;
			}
		}
	}
}


/**
 * Hides Scratch Tutorials
 */
class HideTutorialsTweak {
	constructor () {
		this.url = window.location.href;
	}

	start () {
		if (Helpers.isTopFrame && this.url.startsWith('https://scratch.mit.edu')) {
			Helpers.addCss('.library-item_library-item_1DcMO, .library_filter-bar_1W0DW, .divider_divider_1_Adi, div[aria-label="Tutorials"], .card_card_3GG7C { display: none; }');
			
		  let tutorialNode = document.querySelector('div[aria-label="Tutorials"]');
          let dividerNode = document.querySelector('divider_divider_1_Adi');

			if (tutorialNode) {
				Helpers.removeNode(tutorialNode);
			}
            if (dividerNode) {
				Helpers.removeNode(dividerNode);
            }
		}
	}
}


class HideSpritesTweak {
	constructor () {
		this.url = window.location.href;
	}

    start () {
		if (Helpers.isTopFrame && this.url.startsWith('https://scratch.mit.edu')) {
            const spriteMenuSelector = 'div.action-menu_more-buttons_3Bjkq';
			Helpers.addCss(spriteMenuSelector + ':nth-child(odd)');
			
            const spriteMenuNode = document.querySelector(spriteMenuSelector);

            if (spriteMenuNode && 4 == spriteMenuNode.children.length) {
				Helpers.removeNode(spriteMenuNode.children[3]);
				Helpers.removeNode(spriteMenuNode.children[1]);
			}
		}
	}
}


class TweakInjector {
	constructor () {
		this.url = window.location.href;
	}

	async start () {
		await Config.load();
		if (Helpers.isTopFrame) Config.print();

		HotkeyInterceptor.hook(document);
		this._hookEventIframe();

        if (Config.disableTutorials) {
          try {
              new HideTutorialsTweak().start();
          } catch (ex) {
              console.warn('Unable to hide tutorials.', ex);
          }
        }
        if (Config.disableSprites) {
          try {
              new HideSpritesTweak().start();
          } catch (ex) {
              console.warn('Unable to hide sprites buttons.', ex);
          }
        }

		Helpers.applyStylesheets();
	}

	// hooks keyboard events on an event iframe that has active focus in most drive apps
	// content stripts are not launched in this iframe, because its url is about:blank
	_hookEventIframe () {
		let eventIframeHookAttempts = 200;
		let eventIframeHookInterval = setInterval(function () {
			let eventIframe = document.querySelector('iframe.docs-texteventtarget-iframe');
			if (eventIframe) {
				HotkeyInterceptor.hook(eventIframe.contentDocument);
				eventIframeHookAttempts = 0;
			}

			if (--eventIframeHookAttempts <= 0) {
				clearInterval(eventIframeHookInterval);
			}
		}, 200);
	}
}


new TweakInjector().start();
