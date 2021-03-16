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
	/* ********** PARAMETERS ********** */
	/** True if debug mode is activated. */
	this._debugMode = false;
	/** True if links must be processed. */
	this._processLinks = true;
	/** Links selector. */
	this._linksSelector =   "a"                           // links
	                      + "[href^='/']"                 // with URL starting with a slash
	                      + ":not([href^='//'])"          //  (but not with a double slash)
	                      + ":not([data-vik='false'])"    // not disabled
	                      + ":not([target])"              // without a 'target' attribute
	                      + ":not([onclick])"             // without an 'onclick' attribute
	                      + ","                           // OR
	                      + "a"                           // links
	                      + "[data-vik='true']"           // that are explicitely activated
	                      + ":not([target])"              // but without a 'target' attribute
	                      + ":not([onclick])"             // and without an 'onclick' attribute
	                      ;
	/** True if forms must be processed. */
	this._processForms = true;
	/** Forms selector. */
	this._formsSelector =   "form"                        // forms
	                      + "[method='get']"              // with a GET method
	                      + "[action^='/']"               // with URL starting with a slash
	                      + ":not([action^='//'])"        //  (but not with a double slash)
	                      + ":not([data-vik='false'])"    // not disabled
	                      + ":not([onclick])"             // without an 'onclick' attribute
	                      + ","                           // OR
	                      + "form"                        // forms
	                      + "[data-vik='true']"           // that are explicitely activated
	                      + ":not([onclick])"             // but without an 'onclick' attribute
	                      ;
	/** List of additional node selectors. */
	this._extraSelectors = [];
	/** Handler to call before the page has been loaded. */
	this._preCallback = null;
	/** Handler to call when the page has been loaded. */
	this._postCallback = null;
	/** Ghost mode. */
	this._ghost = false;
	/** Scroll to top. */
	this._scrollToTop = null;
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
	/** True to manage confirmation at page exit, when the value of a form input is changed. */
	this._manageQuitPageConfirmation = true;
	/** Text message used to confirm the page could be exited. */
	this._quitPageConfirmationText = "Are you sure you want to leave this page?";

	/* ********** INTERNAL VARIABLES ********** */
	/** Last loaded URL, to avoid adding it twice to the browser history. */
	this._lastUrl = null;
	/** True when the CTRL key is pressed. */
	this._ctrlPressed = false;
	/** True if a confirmation should be prompted when the page is exited. */
	this._quitPageConfirm = false;
	/** List of loaded JS includes. */
	this._jsIncludes = {};

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
	 *				- scrollToTop (boolean)		Force the scrolling to the top of the page, no matter if the ghost mode was activated or
	 *								if it's a POST form. (default: null)
	 *				- urlPrefix (string)		Prefix to add on fetched URLs. (default: null)
	 *				- title (string)		Selector of the node which contains the page title.
	 *								If empty, the page title will not be updated. (default: "title")
	 *				- titleAttribute (string)	Name of the attribute of the node fetched from the "title" selector, which contains the page title.
	 *								If empty, the text content of the selected node will be used. (default: null)
	 *				- manageQuitPageConfirmation (bool)	If true, manage confirmation at page exit, when a form is filled. (default: true)
	 *				- quiPageConfirmationText (string)	Text of the confirmation message. (default: "Are you sure you want to leave this page?")
	 */
	this.init = function(params) {
		this._initParams(params);
		// once the DOM is ready, update all eligible links
		this.onDocumentReady(function() {
			// init of links
			vik._initLinkNodes();
			// init of forms
			vik._initFormNodes();
			// init of extra nodes
			if (vik._extraSelectors) {
				for (var selector in vik._extraSelectors) {
					vik._initNodes(vik._extraSelectors);
				}
			}
			// execute the post-callback
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
		this._log("Load"), this._log(input);
		params = params ? params : {};
		var isForm = false;
		var url = null;
		var quitPageConfirmationText = this._quitPageConfirmationText;
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
			isForm = (input.nodeName.toLowerCase() == "form") ? true : false;
			// if the node is a link, check if the CTRL key is pressed (open in a new tab)
			if (input.nodeName.toLowerCase() == "a" && this._ctrlPressed) {
				this._log("Link - control key pressed.");
				return (true);
			}
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
			this._log("URL = '" + url + "'.");
			// get parameters from node's attributes
			var val = null;
			if (input.hasAttribute("data-vik-ghost")) {
				val = input.getAttribute("data-vik-ghost");
				if (val == "true")
					params.ghost = true;
				else if (val == "false")
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
			if (input.hasAttribute("data-vik-scroll-to-top")) {
				var attrVal = input.getAttribute("data-vik-scroll-to-top").toLowerCase();
				if (attrVal == "true")
					params.scrollToTop = true;
				else if (attrVal == "false")
					params.scrollToTop = false;
			}
			if (input.hasAttribute("data-vik-prefix"))
				params.urlPrefix = input.getAttribute("data-vik-prefix");
			if (input.hasAttribute("data-vik-pre-callback"))
				params.preCallback = input.getAttribute("data-vik-pre-callback");
			if (input.hasAttribute("data-vik-post-callback"))
				params.postCallback = input.getAttribute("data-vik-post-callback");
			if (input.hasAttribute("data-vik-title"))
				params.title = input.getAttribute("data-vik-title");
			if (input.hasAttribute("data-vik-quit-page-text"))
				quitPageConfirmationText = input.getAttribute("data-vik-quit-page-text");
			// manage forms
			if (isForm) {
				this._log("Form processing.");
				// form validation
				if (input.hasAttribute("data-vik-form-validation")) {
					var validationCallback = input.getAttribute("data-vik-form-validation");
					this._log("Form validation using callback '" + validationCallback + "'.");
					var validated = this.execCallback(validationCallback, input);
					if (!validated) {
						this._log("Form is not valid.");
						return (false);
					}
					this._log("Form is valid.");
				}
				// get form's method
				var method = "get";
				if (input.hasAttribute("method"))
					method = input.getAttribute("method").toLowerCase();
				if (method == "post") {
					/* POST method */
					this._log("POST form.");
					// set ghost mode
					params.ghost = true;
					// set scrollToTop to true, unless it was set to false
					if (this._scrollToTop !== false && (!params.hasOwnProperty("scrollToTop") || params.scrollToTop !== false))
						params.scrollToTop = true;
					// get form data
					params.postData = new FormData(input);
				} else {
					/* GET method */
					this._log("GET form.");
					if ('URLSearchParams' in window) {
						// the browser supports the URLSearchParams API
						this._log("URLSearchParams API is supported.");
						// update URL with form data
						var formData = new FormData(input);
						var queryString = new URLSearchParams(formData).toString();
						this._log("Query string = '" + queryString + "'.");
						url = url + "?" + queryString;
					} else {
						// the browser doesn't support URLSearchParams API
						this._log("No support for URLSearchParam API.");
						// is there jQuery?
						if (typeof window.jQuery == "undefined") {
							// no jQuery available, let the browser send the form
							this._log("jQuery is not loaded.");
							return (true);
						}
						var queryString = $(input).serialize();
						this._log("Query string = '"  + queryString + "'.");
						url = url + "?" + queryString;
					}
				}
			}
		}

		/* management of the "quit page confirmation" */
		var forceThisOneWithoutConfirm = false;
		// if we are on a form, we search if another form was modified; if not, we can deactivate the "quit page" confirmation
		if (this._quitPageConfirm && isForm && !this._foundModifiedForm(input)) {
			// no other modified form, so we can send this form without asking confirmation
			input.removeAttribute("data-_vik-changed");
			if (!params.ghost)
				this.setQuitPageConfirmation(false);
			else
				forceThisOneWithoutConfirm = true;
		}
		if (this._quitPageConfirm && !forceThisOneWithoutConfirm) {
			this._log("Ask confirmation to quit the page.");
			if (!confirm(quitPageConfirmationText)) {
				this._log("Confirmation not granted.");
				return (false);
			}
			this.setQuitPageConfirmation(false);
			this._log("Confirmation granted.");
		}

		// execute the "pre" callback
		var preCallback = params.preCallback ? params.preCallback : vik._preCallback;
		if (preCallback) {
			this._log("Execute 'pre' callback.");
			this.execCallback(
				preCallback,
				function() {
					vik._log("Execution after the 'pre' callback.");
					vik._loadExec(url, params);
				}
			);
		} else {
			// no callback defined, continue the execution
			this._log("Execution.");
			this._loadExec(url, params);
		}
		return (false);
	};
	/**
	 * Method used to enable or disable the confirmation when the page is exited.
	 * @param	bool	activated	True to active the confirmation, false to disable it.
	 */
	this.setQuitPageConfirmation = function(activated) {
		this._log("setQuitPageConfirmation(" + (activated ? "true" : "false") + ").");
		if (activated === true) {
			this._quitPageConfirm = true;
			window.addEventListener("beforeunload", vik._quitPageConfirmExec);
		} else {
			this._quitPageConfirm = false;
			window.removeEventListener("beforeunload", vik._quitPageConfirmExec);
		}
	};
	/**
	 * Method used to get the last URL loaded by Vik.
	 * @return	string|null	The last URL, or null if Vik hasn't been used yet.
	 */
	this.getLastUrl = function() {
		return (this._lastUrl);
	};

	/* ********** PRIVATE METHODS ********** */
	/** Private method used to update object's attributes. */
	this._initParams = function(params) {
		if (!params)
			params = {};
		this._debugMode = (params.debugMode === true) ? true : false;
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
		this._scrollToTop = null;
		if (params.hasOwnProperty("scrollToTop")) {
			if (params.scrollToTop == "true")
				this._scrollToTop = true;
			else if (params.scrollToTop == "false")
				this._scrollToTop = false;
		}
		this._urlPrefix = params.hasOwnProperty("urlPrefix") ? params.urlPrefix : null;
		this._title = params.hasOwnProperty("title") ? params.title : "title";
		this._manageQuitPageConfirmation = params.hasOwnProperty("manageQuitPageConfirmation") ? params.manageQuitPageConfirmation : true;
		if (params.hasOwnProperty("quitPageConfirmationText"))
			this._quitPageConfirmationText = params.quitPageConfirmationText;
	};
	/**
	 * Initialization of link nodes.
	 */
	this._initLinkNodes = function() {
		// check if links must be initialized
		if (!this._processLinks)
			return;
		// get the list of elements to update
		var elements = document.querySelectorAll(this._linksSelector);
		// loop on the elements, and add an 'onclick' attribute to them
		for (var i = 0; i < elements.length; ++i) {
			var elem = elements[i];
			elem.setAttribute("onclick", "return vik.load(this)");
		}
	};
	/**
	 * Initialization of form nodes.
	 */
	this._initFormNodes = function() {
		this._log("Init form nodes.");
		// check if forms must be initialized
		if (!this._processForms) {
			this._log("Don't process forms.");
			return;
		}
		// get the list of elements to update
		var elements = document.querySelectorAll(this._formsSelector);
		// loop on the elements, and add an 'onsubmit' attribute to them
		for (var i = 0; i < elements.length; ++i) {
			var elem = elements[i];
			elem.setAttribute("onsubmit", "return vik.load(this)");
			this._initFormFields(elem);
		}
	};
	/**
	 * Initialization of form fields, to manage the "quit page confirmation".
	 * @param	DOMNode	formNode	DOM node of the form.
	 */
	this._initFormFields = function(formNode) {
		// check if this form's inputs fields must be processed
		if ((this._manageQuitPageConfirmation && formNode.hasAttribute("data-vik-quit-page-confirmation") &&
		     formNode.getAttribute("data-vik-quit-page-confirmation").toLowerCase() == "false") ||
		    (!this._manageQuitPageConfirmation && (!formNode.hasAttribute("data-vik-quit-page-confirmation") ||
		                                           formNode.getAttribute("data-vik-quit-page-confirmation").toLowerCase() != "true"))) {
			return;
		}
		// get the input elements
		var elemSel = "input:not([onchange]), select:not([onchange]), textarea:not([onchange])";
		var inputs = [];
		var inputs = formNode.querySelectorAll(elemSel);
		// loop on the inputs, and add an 'onchange' attribute to them
		for (var j = 0; j < inputs.length; ++j) {
			inputs[j].formNode = formNode;
			inputs[j].setAttribute("onchange", "vik._inputChanged(this)");
		}
	};
	/**
	 * Method called when an input field is modified, to manage the quit page confirmation.
	 * @param	DOMNode	node	The input node.
	 */
	this._inputChanged = function(node) {
		vik.setQuitPageConfirmation(true);
		node.formNode.setAttribute("data-_vik-changed", "true");
	};
	/**
	 * Check if a form was modified.
	 * @param	DOMNode	currentForm	Node of the current form, that must be avoided for the checking.
	 * @return	bool	True if a form was modified, false if not.
	 */
	this._foundModifiedForm = function(currentForm) {
		var selector = "form[data-_vik-changed='true']";
		var checkedForms = document.querySelectorAll(selector);
		for (var i = 0; i < checkedForms.length; ++i) {
			var checkedForm = checkedForms[i];
			if (checkedForm == currentForm)
				continue;
			if (checkedForm.hasAttribute("data-_vik-changed"))
				return (true);
		}
		return (false);
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
		// manage title selector
		params.titleAttribute = null;
		if (params.title) {
			var pos = params.title.lastIndexOf("/");
			if (pos != -1) {
				params.titleAttribute = params.title.substring(pos + 1);
				params.title = params.title.substring(0, pos);
			}
		}

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
		this._log("Target node found.");
		// manage URL prefix
		var realUrl = url;
		if (params.urlPrefix)
			realUrl = params.urlPrefix + url;
		// fetch the page
		var asRaw = (params.source || (params.title && !params.ghost)) ? false : true;
		// fetch the page data
		this.fetchHttp(realUrl, params.strategy, !asRaw, params.postData, function(content) {
			// update page title
			if (!asRaw && params.ghost !== true && params.title) {
				vik._log("Manage page title.");
				var titleNode = content.querySelector(params.title);
				if (!titleNode) {
					console.log("[Vik] Unable to find the page title's node ('" + params.title + "').");
				} else {
					if (!params.titleAttribute) {
						var titleText = titleNode.innerText;
						vik._log("Title text = '" + titleText + "'.");
						if (!titleText)
							console.log("[Vik] Empty title tag '" + titleSelected + "'.");
						else
							document.title = titleText;
					} else if (titleNode.hasAttribute(params.titleAttribute)) {
						var titleText = titleNode.getAttribute(params.titleAttribute);
						vik._log("Title text = '" + titleText + "'.");
						if (!titleText)
							console.log("[Vik] Empty title attribute '" + params.titleAttribute + "'.");
						else
							document.title = titleText;
					} else {
						console.log("[Vik] Unable to find the page title's attribute '" + params.titleAttribute + "' on the node '" + params.title + "'.");
					}
				}
			}
			// write the content in the right place
			if (asRaw) {
				vik._log("Write content as raw HTML.");
				targetNode.innerHTML = content;
			} else if (!params.source) {
				if (!content.firstChild) {
					console.log("[Vik] The fetched content is not valid HTML.");
					return (false);
				}
				vik._log("Copy first node's HTML of the source in the target node.");
				targetNode.innerHTML = content.firstChild.innerHTML;
			} else {
				// search the source node
				var srcNode = content.querySelector(params.source);
				if (!srcNode) {
					console.log("[Vik] Source selector '" + params.source + "' returns nothing.");
					return;
				}
				vik._log("Source node found.");
				// extract <script> tags
				var scripts = srcNode.querySelectorAll("script");
				// strategy-based processing
				if (params.strategy == "copy") {
					// copy strategy
					vik._log("(copy strategy) Move source's childnodes into target.");
					targetNode.innerHTML = "";
					if (srcNode.childNodes) {
						while (srcNode.hasChildNodes())
							targetNode.appendChild(srcNode.firstChild);
					}
				} else if (params.strategy == "fill") {
					// "fill" strategy
					vik._log("(fill strategy) Move source node into target.");
					targetNode.innerHTML = "";
					targetNode.appendChild(srcNode);
				} else {
					// replace strategy
					vik._log("(replace strategy) Replace the target node with the source node.");
					targetNode.replaceWith(srcNode);
				}
				// copy script tags
				vik._loadScriptNodes(scripts);
			}
			// if not ghost mode
			if (params.ghost !== true) {
				// remove quit page confirmation
				vik.setQuitPageConfirmation(false);
				// browser history management
				if (vik._lastUrl == url) {
					vik._log("Same URL as the previous one. No addition to browser history.");
				} else {
					vik._log("Add URL to browser history.");
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
			// scroll to top if not in ghost mode or if it was asked
			if (params.ghost !== true || params.scrollToTop === true) {
				vik._log("Scroll to top.");
				window.scrollTo(0, 0);
			}
			// process the whole page again
			vik._log("Process the whole page again.");
			vik.init(vik._getParams());
		});
		return (false);
	};
	/**
	 * Create a param object, from the current object's parameters.
	 * @return	object	A parameter object.
	 */
	this._getParams = function() {
		var params = {
			debugMode: this._debugMode,
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
			scrollToTop: this._scrollToTop,
			urlPrefix: this._urlPrefix,
			title: this._title,
			titleAttribute: this._titleAttribute
		};
		return (params);
	};
	/**
	 * Enable the confirmation when the page is exited.
	 */
	this._quitPageConfirmExec = function(e) {
		var msg = "Leave the page?";
		e.returnValue = msg;
		return (msg);
	};
	/**
	 * Load the JS from a <script> tag.
	 * @param	array	scriptNodes	List of source script nodes.
	 */
	this._loadScriptNodes = function(scriptNodes) {
		var parentNode = document.getElementsByTagName("head").item(0);
		if (!parentNode)
			return;
		// loop on source <script> nodes
		for (var i = 0; i < scriptNodes.length; ++i) {
			var scriptNode = scriptNodes[i];
			var newScript = document.createElement("script");
			newScript.setAttribute("type", "text/javascript");
			if (scriptNode.hasAttribute("src")) {
				var src = scriptNode.getAttribute("src");
				// check if it was already loaded
				if (vik._jsIncludes.hasOwnProperty(src))
					continue;
				newScript.setAttribute("src", src);
				vik._jsIncludes[src] = true;
			} else {
				newScript.innerHTML = scriptNode.innerHTML;
			}
			// add the node to the page
			parentNode.appendChild(newScript);
		}
	};
	/**
	 * Write a log message to the console, if the debug mode was activated.
	 * @param	string	msg	The log message.
	 */
	this._log = function(msg) {
		if (!this._debugMode)
			return;
		if (typeof msg === "string")
			console.log("[Vik] " + msg);
		else
			console.log(msg);
	};

	/* ********** HISTORY MANAGEMENT ********** */
	/**
	 * Method called when backward/forward buttons are clicked.
	 * @param	Event	event	PopState event.
	 */
	this._onpopstate = function(event) {
		this._log("popstate");
		// get the stored state
		var state = event.state;
		this._log(state);
		// no state: load the page directly from the browser
		if (!state) {
			this._log("No state. Browser loading.");
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
			this._log("No target node. Browser loading.");
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
				// extract <script> tags
				var scripts = srcNode.querySelectorAll("script");
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
				// copy script tags
				vik._loadScriptNodes(scripts);
			}
			// set the last URL
			vik._lastUrl = state.url;
			// process the whole page again
			vik._log("Process the whole page again.");
			vik.init(vik._getParams());
		});
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
};

