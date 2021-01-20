/**
 * Vik object.
 *
 * A target selector must be given.
 * If no source selector is given, the whole response is copied inside the target node.
 * If a source selector is given:
 * - "replace" strategy: the target node is replaced by the source node.
 * - "fill" strategy: the source node is copied inside the target node.
 * - "copy" strategy: the content of the source node is copied inside the target node.
 *
 * Default:
 * - target: "body"
 * - source: "body"
 * - strategy: "replace"
 *
 * <a href="/path/to/page">...</a>
 * <a href="/path/to/page" onclick="vik.load(this)">...</a>
 * <a href="/path/to/page" data-vik-option1="val1" onclick="vik.load(this)">...</a>
 * <form action="/path/to/script">...</form>
 * <form action="/path/to/script" onclick="vik.load(this)">...</form>
 * <form action="/path/to/script" data-vik-option1="val1" onclick="vik.load(this)">...</a>
 * <button onclick="vik.load(this)">...</button>
 * <script>vik.load(url, {target: "#content", ghost: true});</script>
 */
var vik = new function() {
	/* ********** PRIVATE ATTRIBUTES ********** */
	/** True if links must be processed. */
	this._processLinks = true;
	/** Links selector. */
	this._linksSelector =   "a"                             // links
	                      + "[href^='/']"                   // with URL starting with a slash
	                      + ":not([href^='//'])"            //          but not with a double slash
	                      + ":not([data-vik='off'])"        // not disabled
	                      + ":not([data-vik='false'])"
	                      + ":not([data-vik='no'])"
	                      + ":not([data-vik^='disable'])"
	                      + ":not([data-vik='0'])"
	                      + ":not([target])"                // without a 'target' attribute
	                      + ":not([onclick])";              // without an 'onclick' attribute
	/** True if forms must be processed. */
	this._processForms = true;
	/** Forms selector. */
	this._formsSelector =   "form"                  // forms
	                      + "[action^='/']"         // with URL starting with a slash
	                      + ":not([action^='//'])"  //          but not with a double slash
	                      + ":not([data-vik='off'])"        // not disabled
	                      + ":not([data-vik='false'])"
	                      + ":not([data-vik='no'])"
	                      + ":not([data-vik^='disable'])"
	                      + ":not([data-vik='0'])"
	                      + ":not([onclick])"       // without an 'onclick' attribute
	                      + ":not([method='get'])"; // not with a 'get' method
	/** List of additional node selectors. */
	this._extraSelectors = [];
	/** Handler to call before the page has been loaded. */
	this._preCallback = null;
	/** Handler to call when the page has been loaded. */
	this._postCallback = null;
	/** Ghost mode. */
	this._ghost = false;
	/** Selector of the node which contains the page title. */
	this._title = "title";
	/** Name of the attribute which contains the page title, from the 'title' selector. If empty, use the node itself. */
	this._titleAttribute = null;
	/** Selector of the default target, where the loaded content will be written. */
	this._target = "body";
	/** Selector of the extracted element in the fetched data. */
	this._source = "body";
	/** Strategy applied when data are copied from the source to the target. */
	this._strategy = "replace";
	/** Prefix to add on fetched URLs. */
	this._urlPrefix = null;
	/** Last loaded URL, to avoid adding it twice to the browser history. */
	this._lastUrl = null;
	/** True when the CTRL key is pressed. */
	this._ctrlPressed = false;

	/* ********** EVENT MANAGERS ********** */
	// CTRL key press management
	document.addEventListener("keydown", function(event) {
		if (event.which == "17")
			vik._ctrlPressed = true;
	});
	document.addEventListener("keyup", function(event) {
		if (event.which == "17")
			vik._ctrlPressed = false;
	});
	// management of backward/forward buttons
	window.onpopstate = function(event) {
		vik._onpopstate(event);
	};

	/* ********** INITIALIZATION ********** */
	/**
	 * Method called to initialize Vik at page loading.
	 * @param	Object	params	Associative array with parameter values:
	 *				- processLinks (boolean)	Tell if links (<a> tags) must be processed. (default: true)
	 *				- linksSelector (string)	Selector used to fetch links.
	 *				- processForms (boolean)	Tell if form (<form> tags) must be processed. (default: false)
	 *				- formsSelect (string)		Selector used to fetch forms.
	 *				- extraSelectors (array)	List of extra node selectors. (default: [])
	 *				- ghost (boolean)		Tell if loadings should be in ghost mode (no addition in history). (default: false)
	 *				- preCallback (Closure)		Handler to call before the page has been loaded.
	 *				- postCallback (Closure)	Handler to call after the page has been loaded.
	 *				- strategy (string)		"replace" or "fill". (default: "replace")
	 *				- target (string)		Selector of the current page's element which will be the target of the managed links. (default: "body")
	 *				- source (string)		Selector of the response's element which will contain the HTML to load.
	 *								If this element is not found, the whole response will be used.
	 *								If this parameter is set to null, the whole response will be used. (default: "body")
	 *				- urlPrefix (string)		Prefix to add on fetched URLs. (default: null)
	 *				- title (string)		Selector of the node which contains the page title.
	 *								If empty, the page title will not be updated. (default: "title")
	 *				- titleAttribute (string)	Name of the attribute of the node fetched from the "title" selector, which contains the page title.
	 *								If empty, the text content of the selected node will be used. (default: null)
	 */
	this.init = function(params) {
		this._initParams(params);
		// once the DOM is ready, update all eligible links
		this.onDocumentReady(function() {
			// init of links
			if (vik._processLinks)
				vik._initNodes(vik._linksSelector);
			// init of forms
			if (vik._processForms)
				vik._initNodes(vik._formsSelector);
			// init of extra nodes
			if (vik._extraSelectors) {
				for (var selector in vik._extraSelectors) {
					vik._initNodes(vik._extraSelectors);
				}
			}
			// call the handler (if defined)
			vik.execCallback(vik._postCallback);
		});
	};

	/* ********** LOADING ********** */
	/**
	 * Method called when a link is clicked.
	 * @param	string|DOMNode	input		URL of the page to load or link's node.
	 * @param	Object		params		Parameters.
	 */
	this.load = function(input, params) {
		params = params ? params : {};
		var url = null;
		// check input
		if (!input) {
			console.log("[Vik] Empty input.");
			return (false);
		}
		// process the input
		if (typeof input === "string") {
			// the URL was given as input
			url = input;
			params.ghost = true;
		} else {
			// a DOM node was given as parameter
			var isForm = (input.nodeName.toLowerCase() == "form") ? true : false;
			// if the node is a link, check if the CTRL key is pressed (open in a new tab)
			if (input.nodeName.toLowerCase() == "a" && this._ctrlPressed)
				return (true);
			// get the URL
			if (input.hasAttribute("data-vik-url")) {
				url = input.getAttribute("data-vik-url");
			} else if (isForm && input.hasAttribute("action")) {
				url = input.getAttribute("action");
			} else if (input.hasAttribute("href")) {
				url = input.getAttribute("href");
			}
			if (!url) {
				console.log("[Vik] Unable to find URL.");
				return (false);
			}
			// get parameters from node's attributes
			var val = null;
			if (input.hasAttribute("data-vik-ghost")) {
				val = input.getAttribute("data-vik-ghost");
				if (val == "true" || val == "1" || val == "on" || val == "yes" || val == "enable")
					params.ghost = true;
				else if (val == "false" || val == "0" || val == "off" || val == "no" || val == "disable")
					params.ghost = false;
			}
			if (input.hasAttribute("data-vik-strategy")) {
				val = input.getAttribute("data-vik-strategy");
				if (val == "replace" || val == "fill" || val == "copy")
					params.strategy = val;
			}
			if (input.hasAttribute("data-vik-target"))
				params.target = input.getAttribute("data-vik-target");
			if (input.hasAttribute("data-vik-source"))
				params.source = input.getAttribute("data-vik-source");
			if (input.hasAttribute("data-vik-prefix"))
				params.urlPrefix = input.getAttribute("data-vik-prefix");
			if (input.hasAttribute("data-vik-pre-callback"))
				params.preCallback = input.getAttribute("data-vik-pre-callback");
			if (input.hasAttribute("data-vik-post-callback"))
				params.postCallback = input.getAttribute("data-vik-post-callback");
			if (input.hasAttribute("data-vik-title"))
				params.title = input.getAttribute("data-vik-title");
			if (input.hasAttribute("data-vik-title-attribute"))
				params.titleAttribute = input.getAttribute("data-vik-title-attribute");
			// manage forms
			if (isForm) {
				// get form data
				params.postData = new FormData(input);
				// set ghost mode
				params.ghost = true;
			}
		}
		// execute the "pre" callback
		var preCallback = params.preCallback ? params.preCallback : vik._preCallback;
		if (preCallback) {
			this.execCallback(
				preCallback,
				function() {
					vik._loadExec(url, params);
				}
			);
		} else {
			// no callback defined, continue the execution
			this._loadExec(url, params);
		}
		return (false);
	};

	/* ********** UTILITIES ********** */
	/**
	 * Method used to trigger some code when the document is loaded.
	 * @param	Closure	handler	Function to execute.
	 * @link	https://stackoverflow.com/questions/9899372/pure-javascript-equivalent-of-jquerys-ready-how-to-call-a-function-when-t/9899701#9899701
	 */
	this.onDocumentReady = function(handler) {
		// see if DOM is already available
		if (document.readyState === "complete" || document.readyState === "interactive") {
			// call on next available tick
			setTimeout(handler, 1);
		} else {
			document.addEventListener("DOMContentLoaded", handler, {capture: false, once: true});
		}
	};
	/**
	 * Do an AJAX request.
	 * @param	string		url		URL to fetch.
	 * @param	string		strategy	Vik merging strategy. Will be sent as HTTP header, if not empty or null.
	 * @param	bool		asHTML		True to get an HTML response.
	 * @param	FormData	postData	POST data, or null for GET requests.
	 * @param	Closure		handler		Callback function.
	 */
	this.fetchHttp = function(url, strategy, asHTML, postData, handler) {
		var xhr = new XMLHttpRequest();
		if (postData) {
			xhr.open("POST", url, true);
			//xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		} else
			xhr.open("GET", url, true);
		if (strategy)
			xhr.setRequestHeader("x-vik-strategy", strategy);
		if (asHTML === true)
			xhr.responseType = "document";
		xhr.onreadystatechange = function() {
			if (this.readyState != 4 || this.status != 200)
				return;
			if (asHTML === true)
				handler(this.responseXML);
			else
				handler(this.response);
		};
		xhr.send(postData);
	};
	/**
	 * Execute a function.
	 * @param	string|Closure	handler	Callback or function name.
	 * @param	mixed		param	Variable given to the callback as parameter.
	 * @return	mixed	What the handler returned.
	 */
	this.execCallback = function(handler, param) {
		if (!handler)
			return (undefined);
		if (typeof handler === "function")
			return (handler(param));
		if (typeof handler === "string")
			return (window[handler](param));
		return (undefined);
	};

	/* ********** PRIVATE METHODS ********** */
	/** Private method used to update object's attributes. */
	this._initParams = function(params) {
		if (!params)
			params = {};
		this._processLinks = (params.processLinks === false) ? false : true;
		this._linksSelector = params.linksSelector ? params.linksSelector : this._linksSelector;
		this._processForms = (params.processForms === false) ? false : true;
		this._formsSelector = params.formsSelector ? params.formsSelector : this._formsSelector;
		this._extraSelectors = params.extraSelectors ? params.extraSelectors : this._extraSelectors;
		this._ghost = (params.ghost === true) ? true : false;
		this._preCallback = params.hasOwnProperty("preCallback") ? params.preCallback : null;
		this._postCallback = params.hasOwnProperty("postCallback") ? params.postCallback : null;
		this._target = params.hasOwnProperty("target") ? params.target : "body";
		this._source = params.hasOwnProperty("source") ? params.source : "body";
		this._strategy = "replace";
		if (params.strategy == "fill" || params.strategy == "copy")
			this._strategy = params.strategy;
		this._urlPrefix = params.hasOwnProperty("urlPrefix") ? params.urlPrefix : null;
		this._title = params.hasOwnProperty("title") ? params.title : "title";
		this._titleAttribute = params.hasOwnProperty("titleAttribute") ? params.titleAttribute : null;
	};
	/**
	 * Initialization of DOM nodes which will be managed by Vik.
	 * @param	string	selector	Selector string used to find DOM nodes.
	 */
	this._initNodes = function(selector) {
		// get the list of elements to update
		var elements = document.querySelectorAll(selector);
		// loop on the elements, and add an 'onclick' attribute to them
		for (var i = 0; i < elements.length; ++i) {
			var elem = elements[i];
			var attributeName = (elem.nodeName == "form") ? "onsubmit" : "onclick";
			elem.setAttribute(attributeName, "return vik.load(this)");
		}
	};
	/**
	 * Real processing of a click on a link.
	 * @param	string	url		URL to fetch.
	 * @param	Object	initParams	Parameters.
	 * @link	https://developer.mozilla.org/fr/docs/Web/API/XMLHttpRequest/send
	 * @link	https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
	 */
	this._loadExec = function(url, initParams) {
		// check params
		if (!params)
			params = {};
		// get global parameters...
		var vikParams = this._getParams();
		// ...overload them with method's parameters
		var params = this._overload(vikParams, initParams);

		// find target node
		if (!params.target) {
			console.log("[Vik] No target selector defined.");
			return (false);
		}
		var targetNode = document.querySelector(params.target);
		if (!targetNode) {
			console.log("[Vik] Unable to find target element '" + params.target + "'.");
			return (false);
		}
		// manage URL prefix
		var realUrl = url;
		if (params.urlPrefix)
			realUrl = params.urlPrefix + url;

		// fetch the page
		var asRaw = (params.source || (params.title && !params.ghost)) ? false : true;
		// fetch the page data
		this.fetchHttp(url, params.strategy, !asRaw, params.postData, function(content) {
			// write the content in the right place
			if (asRaw) {
				targetNode.innerHTML = content;
			} else if (!params.source) {
				if (!content.firstChild) {
					console.log("[Vik] The fetched content is not valid HTML.");
					return (false);
				}
				targetNode.innerHTML = content.firstChild.innerHTML;
			} else {
				// search the source node
				var srcNode = content.querySelector(params.source);
				if (!srcNode) {
					console.log("[Vik] Source selector '" + params.source + "' returns nothing.");
					return;
				}
				// strategy-based processing
				if (params.strategy == "copy") {
					// copy strategy
					targetNode.innerHTML = "";
					if (srcNode.childNodes) {
						while (srcNode.hasChildNodes())
							targetNode.appendChild(srcNode.firstChild);
					}
				} else if (params.strategy == "fill") {
					// "fill" strategy
					targetNode.innerHTML = "";
					targetNode.appendChild(srcNode);
				} else {
					// replace strategy
					targetNode.replaceWith(srcNode);
				}
			}
			// if not ghost mode
			if (params.ghost !== true) {
				// update page title
				if (params.title) {
					var titleNode = content.querySelector(params.title);
					if (!titleNode) {
						console.log("[Vik] Unable to find the page title's node ('" + params.title + "').");
					} else {
						if (!params.titleAttribute) {
							var titleText = titleNode.innerText;
							if (!titleText)
								console.log("[Vik] Empty title tag '" + titleSelected + "'.");
							else
								document.title = titleText;
						} else if (titleNode.hasAttribute(params.titleAttribute)) {
							var titleText = titleNode.getAttribute(params.titleAttribute);
							if (!titleText)
								console.log("[Vik] Empty title attribute '" + params.titleAttribute + "'.");
							else
								document.title = titleText;
						} else {
							console.log("[Vik] Unable to find the page title's attribute '" + params.titleAttribute + "' on the node '" + params.title + "'.");
						}
					}
				}
				// scroll to top
				window.scrollTo(0, 0);
				// browser history management
				if (vik._lastUrl != url) {
					vik._lastUrl = url;
					// history state (state = clone of method's params + url)
					var state = {
						"url": url
					};
					vik._overload(state, initParams);
					// add to history
					window.history.pushState(state, "", url);
				}
			}
			// process the whole page again
			vik.init(vik._getParams());
			// execute the "post" callback
			if (params.postCallback)
				vik.execCallback(params.postCallback);
		});
		return (false);
	};
	/**
	 * Create a param object, from the current object's parameters.
	 * @return	object	A parameter object.
	 */
	this._getParams = function() {
		var params = {
			processLinks: this._processLinks,
			linksSelector: this._linksSelector,
			processForms: this._processForms,
			formsSelector: this._formsSelector,
			extraSelectors: this._extraSelectors,
			preCallback: this._preCallback,
			postCallback: this._postCallback,
			ghost: this._ghost,
			target: this._target,
			source: this._source,
			strategy: this._strategy,
			urlPrefix: this._urlPrefix,
			title: this._title,
			titleAttribute: this._titleAttribute
		};
		return (params);
	};
	/**
	 * Overload an object with another one.
	 * @param	object	source		The base object, which will be overloaded.
	 * @param	object	overload	The overoad object.
	 * @return	object	The resulting object.
	 */
	this._overload = function(source, overload) {
		source = source ? source : {};
		overload = overload ? overload : {};
		for (var prop in overload) {
			if (overload.hasOwnProperty(prop))
				source[prop] = overload[prop];
		}
		return (source);
	};

	/* ********** HISTORY MANAGEMENT ********** */
	/**
	 * Method called when backward/forward buttons are clicked.
	 * @param	Event	event	PopState event.
	 */
	this._onpopstate = function(event) {
		// get the stored state
		var state = event.state;
		// no state: load the page directly from the browser
		if (!state) {
			window.location.href = document.location;
			return;
		}
		// get the target
		var target = null;
		var targetNode = null;
		if (state.target)
			targetNode = document.querySelector(target = state.target);
		if (!targetNode && this._target)
			targetNode = document.querySelector(target = this._target);
		if (!targetNode) {
			window.location.href = document.location;
			return;
		}
		// get the source node
		var source = state.hasOwnProperty("source") ? state.source : this._source;
		var asHTML = source ? true : false;
		var strategy = state.strategy ? state.strategy : vik._strategy;
		// fetch the page data
		vik.fetchHttp(state.url, strategy, asHTML, null, function(content) {
			// write the content in the right place
			if (!asHTML) {
				targetNode.innerHTML = content;
			} else {
				// search the source node
				var srcNode = content.querySelector(source);
				if (!srcNode) {
					console.log("[Vik] Source selector '" + source + "' returns nothing.");
					return;
				}
				// strategy-based processing
				if (strategy == "copy") {
					// copy strategy
					targetNode.innerHTML = "";
					if (srcNode.childNodes) {
						while (srcNode.hasChildNodes())
							targetNode.appendChild(srcNode.firstChild);
					}
				} else if (strategy == "fill") {
					// "fill" strategy
					targetNode.innerHTML = "";
					targetNode.appendChild(srcNode);
				} else {
					// replace strategy
					targetNode.replaceWith(srcNode);
				}
			}
			// execute the "after" callbacks
			if (vik._postCallback)
				vik.execCallback(vik._postCallback);
			if (state.postCallback)
				vik.execCallback(state.postCallback);
		});
	};
};

