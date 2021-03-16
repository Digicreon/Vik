# Vik
Vik is a Javascript library that accelerate your website without using a JS framework nor modifying your backend code.

It is similar similar to [GitHub's pjax](https://github.com/defunkt/jquery-pjax) and [Basecamp's TurboLink](https://turbo.hotwire.dev/).


## 1. How Vik works?
By default, Vik alter all links and forms in your HTML page, to make them load pages by AJAX requests. Then, when a link is clicked, the HTML page is fetched and its content is written in the current page; but there is no processing of the new content's CSS and Javascript, so the navigation is faster and smoother.

It is possible to configure Vik to load only fragments of the fetched HTML contents, and put them in a sub-part of the current page. By default, Vik searches for a `<body>` tag and use it to replace the current page's `<body>` tag.

By default, each time a link is clicked, it's destination is added to the browser history, so backward/forward buttons work as they should. But you can configure a link (or all links) to be in "ghost mode".

By default, the content of the fetched page's `<title>` tag is used to update the current page's title (this feature could be configured or disabled).


## 2. How to use Vik
### 2.1 Initialization
Include the `vik.js` file in your HTML content:
```html
<script src="/path/to/vik.js"></script>
```
Then initialize Vik:
```html
<script>
    vik.init();
</script>
```

If you need to execute some code an all pages (libraries init, or your own code to set up some UI-related stuff), you should put it in a function, and give this function to Vik as a callback. Then, this code will be executed when the current page is loaded, as well as each time a link is clicked or a form is sent. See below for more information.


### 2.2 Default behaviour
Here is the default behaviour of Vik:
* It overrides links (`<a>` tags) and forms (`<form>` tags)
    * which target URL starts with a slash ("`/`") but not a double slash ("`//`");
    * without an `onclick` or `target` attribute;
    * which are not disabled (see the `data-vik` attribute below).
    * for a form: without a `method` attribute having a "`get`" value;
* When a link is clicked (or a form is sent)
    1. the linked page's URL is taken from the `href` attribute (the `action` attribute for a form);
    1. the linked page is fetched (for a form: input data are sent in the request);
    1. the `<body>` tag of the fetched content is searched, and it is used to replace the `<body>` tag of the current page;
    1. the `<title>` tag of the fetched content is searched, and its content is used to update the page title;
    1. the linked URL is added to the browser history (not for forms).

Most aspects of this behaviour are customizable.


### 2.3 Key concepts
* "**ghost mode**": By default, each click on a Vik-enabled link (not forms) will add an entry in the browser history. When the ghost mode is activated, no entry is added.
* "**target**": It's the DOM node (the HTML tag) in the currently displayed page, which will be the receptacle to the fetched pages.
* "**source**": It's the DOM node (the HTML tag) in the fetched page, which contains the fragment that must be displayed. If not set, the entire fetched content will be displayed (it's the fastest processing).
* "**strategy**": When a *source* is defined, there is three different ways to merge it in the *target*.
    * "**replace**": The *target* node is replaced by the *source* node. It's the fastest strategy (as long as a *source* is defined; it's even faster when no *source* is defined).
    * "**fill**": The *target* node's content is deleted, and then the *source* node is placed inside the *target* node.
    * "**copy**": The *target* node's content is deleted, and then the content of the *source* node is copied inside the *target* node.
* "**callbacks**": It is possible to configure Vik in order to execute some functions before and/or after fetching a page. A common usage may be to display a "spinning wheel" before fetching the page, to let the user know something is going on, and then remove it after the page has been fetched.
    * "pre callback" is executed before fetching, "post callback" is executed after.
    * The "post callback" is called during Viki initialization, and after that, each time a new page is fetched. So if you need to initialize some front-end Javascript librairies, it is the right place to do it.

## 3. Configuration
### 3.1 General configuration
At initialization, it is possible to configure Vik in a global manner.

Here is an example, where all links are in "ghost mode" (no update of the browser history), and forms are not managed:
```javascript
vik.init({
    ghost: true,
    processForms: false
});
```
Parameters:
* `processLinks` (boolean): Tell if links (`<a>` tags) must be processed. (default: `true`)
* `linksSelector` (string): Selector used to fetch the links to modify. (shouldn't be modified)
* `processForms` (boolean): Tell if form (`<form>` tags) must be processed. (default: `true`)
* `formsSelector` (string): Selector used to fetch forms. (shouldn't be modified)
* `extraSelectors` (array): List of extra node selectors. (default: `[]`)
* `ghost` (boolean): Tell if loadings should be in ghost mode (no addition in history). (default: `false` in general, and `true` for POST forms)
* `preCallback` (function): Handler to call before the page has been loaded. Could be a function name or an anonymous function.
* `postCallback` (function): Handler to call after the page has been loaded. Could be a function name or an anonymous function.
* `strategy` (string): Merging strategy, could be "`replace`", "`fill`" or "`copy`". (default: "`replace`")
    * `replace`: The target node is replaced by the source node.
    * `fill`: The source node is copied inside the target node.
    * `copy`: The content of the source node is copied inside the target node.
* `target` (string): Selector of the current page's element which will be the target of the managed links. (default: "`body`")
* `source` (string): Selector of the response's element which will contain the HTML to load. If this element is not found, the whole response will be used. If this parameter is set to null, the whole response will be used. (default: "`body`")
* `scrollToTop` (boolean): If set to `true`, always scroll to the top of the page when a page is fetched, even if the ghost mode was activated. If set to `false`, never scroll to the top of the page, even if the ghost mode was deactivated. (default: `false` if ghost mode was activated)
* `urlPrefix` (string): Prefix to add on fetched URLs. (default: `null`)
* `title` (string): Selector of the node which contains the page title. If empty, the page title will not be updated. If the title's text is stored in an attribute of the node (instead of the node's text content), the attribute's name must be added at the end of the selector, separated by a slash. (default: "`title`")
* `manageQuitPageConfirmation` (boolean): Tell if a confirmation popup should be displayed when the user tries to quit the current page whereas a form has begun to be filled. See below for more information. (default: `true`)
* `quitPageConfirmationText` (string): Text used for the confirmation box before leaving the page.


### 3.2 Links and forms configuration
It is possible to add special attributes to a link (or a form) tag, to modify its behaviour.

For example, here the link will *not* be managed by Vik:
```html
<a href="/path/to/page" data-vik="false">link title</a>
```

Another example, where the link will be in "ghost mode" (no update of the browser history):
```html
<a href="/path/to/page" data-vik-ghost="true">link title</a>
```

Attributes:
* `data-vik`: Used to avoid Vik management on a link if set to "`false`".
* `data-vik-url`: Allow to force an URL different than the one set in the `href` or `action` attribute.
* `data-vik-ghost`: Tell if the "ghost mode" must be used. Possible values are "`true`" or "`false`".
* `data-vik-strategy`: Merging strategy. Possible values are "`replace`", "`fill`" or "`copy`".
* `data-vik-target`: Selector of the DOM element (in the current page) that will be replaced by (or filled by) the fetched content.
* `data-vik-source`: Selector of the DOM element (in the fetched page) that will replace (or fill into, or be copied into) the target node.
* `data-vik-pre-callback`: Name of a Javascript function to execute *before* the new content will be fetched.
* `data-vik-post-callback`: Name of a Javascript function to execute *after* the new content has been fetched.
* `data-vik-title`: Selector of the DOM element which contains the new title of the page. If the title's text is stored in an attribute of the node (instead of the node's text content), the attribute's name must be added at the end of the selector, separated by a slash. Set to an empty string to avoid title update.
* `data-vik-scroll-to-top`: "`false`" to not scroll to the top of the page. "`true`" to scroll to the top of the page (even if the ghost mode was activated, or if it is a POST form).
* `data-vik-quit-page-confirmation`: **Forms only.** Tell if a confirmation popup should be displayed when the user tries to quit the current page whereas this form has begun to be filled. Possible values are "`true`" or "`false`".
* `data-vik-quit-page-text`: **Forms only.** Text used for the confirmation before before leaving the page.
* `data-vik-form-validation`: **Forms only.** Name of a Javascript function to execute in order to validate the form's content. The function will receive the form's DOM element as parameter, and must return a boolean value (`true` is the form is valid and could be sent; `false` if the form contains errors).

### 3.3 Configuration priority
Tag attributes have priority over the global configuration.

For example, it is possible to configure Vik in order to set all links in "ghost mode", and ask for one link to be added to the browser's history:
```html
<html>
<body>
    <!-- these links are in ghost mode -->
    <a href="/url1">link 1</a>
    <a href="/url2">link 2</a>

    <!-- this link is not in ghost mode -->
    <a href="/url3" data-vik-ghost="false">link 3</a>

    <script>
        // Vik init: all links are in ghost mode by default
        vik.init({ghost: true});
    </script>
</body>
</html>
```

Another example: All the linked pages' full content will be loaded in a special `<div>`, and the page's title will not be updated. But for one link, its `<body>` tag will replace the current page's `<body>` tag, and the fetched page's title will be used (so the default behaviour become a special behaviour).
```html
<html>
<body>
    <div id="content"></div>
    <!-- these links are loaded in the #content div -->
    <a href="/url1">link 1</a>
    <a href="/url2">link 2</a>

    <!-- this link's body will replace the current body -->
    <a href="/url3"
       data-vik-source="body"
       data-vik-target="body"
       data-vik-strategy="replace"
       data-vik-title="title">link 3</a>

    <script>
        // empty source: the whole answer will be used
        // target: content will be written in the given node
        // empty title: the current page's title will not be updated
        vik.init({
            source: null,
            target: "#content",
            title: null
        });
    </script>
</body>
</html>
```


## 4. Pure Javascript call
### 4.1 Page load
Vik may be used to load pages without having a dedicated link in the page, by calling it from Javascript code. To do so, your code can call the `vik.load()` function, giving the URL as its first parameter. Configuration could be given as the second parameter, with the same keys than the initialization.

Example:
```html
<html>
<body>

    <script>
        // wait 30 seconds and load a new page
        settimeout(function() {
            vik.load("/url1", {
                ghost: false,
                source: null,
                target: "body",
                urlPrefix: "/ajax"
            });
        }, 30000);
    </script>

</body>
</html>
```

### 4.2 Confirmation when the current page is exited
It is possible to tell Vik to enable or disable the "quit page confirmation" feature, by calling the `vik.setQuitPageConfirmation()` function, giving a boolean as parameter (`true` to enable, `false` to disable the feature).

Example:
```html
<html>
<body>

    <script>
        // enable the "quit page confirmation" feature
        vik.setQuitPageConfirmation(true);
        // load a page; a confirmation popup will ask confirmation
        vik.load("/url1");
    </Script>

</body>
</html>
```

