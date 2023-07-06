# Vik
Vik is a Javascript library that accelerate your website without using a JS framework nor modifying your backend code.

It is similar to [GitHub's pjax](https://github.com/defunkt/jquery-pjax) and [Basecamp's TurboLink](https://turbo.hotwire.dev/).


## 1. How does Vik works?
Vik alters all links and forms in your HTML page, to make them load pages using AJAX requests. Then, when a link is clicked, the HTML page is fetched and its content is written in the current page; but there is no processing of the new content's CSS and Javascript, so the navigation is a lot faster and smoother.

It is possible to configure Vik to load only fragments of the fetched HTML contents, and put them in a sub-part of the current page. By default, Vik searches for a `<body>` tag and use it to replace the current page's `<body>` tag.

By default, each time a link is clicked, its destination is added to the browser history, so backward/forward buttons work as they should. But you can configure a link (or all links) to be in "ghost mode" (not added to the history).

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

If you need to execute some code on all pages (initialization of libraries, or execution of your own code to set up some UI-related stuff), you should put it in a function, and give this function to Vik as a callbacki, or bind this function to the `vik:postLoad` event. Then, this code will be executed when the current page is loaded, as well as each time a link is clicked or a form is sent. See below for more information.


### 2.2 Default behavior
Here is the default behavior of Vik:
* It overrides links (`<a>` tags) and forms (`<form>` tags)
    * which target URL starts with a slash ("`/`") but not a double slash ("`//`");
    * without an `onclick` (for links) or `onsubmit` (for forms) attribute;
    * without a `target` attribute;
    * which are not disabled (see the `data-vik` attribute below).
    * for a form: without a `method` attribute having a "`get`" value;
* When a link is clicked (or a form is sent)
    1. the linked page's URL is taken from the `href` attribute (the `action` attribute for a form);
    1. the linked page is fetched (for a form: input data are sent in the request);
    1. the `<body>` tag of the fetched content is searched, and it is used to replace the `<body>` tag of the current page;
    1. the `<title>` tag of the fetched content is searched, and its content is used to update the page title;
    1. the linked URL is added to the browser history (not for forms).

Most aspects of this behavior are customizable.


### 2.3 Key concepts
* "**ghost mode**": By default, each click on a Vik-enabled link (not forms) will add an entry in the browser history. When the ghost mode is activated, no entry is added.
* "**target**": It's the DOM node (the HTML tag) in the currently displayed page, which will be the receptacle to the fetched pages.
* "**source**": It's the DOM node (the HTML tag) in the fetched page, which contains the fragment that must be displayed. If not set, the entire fetched content will be displayed (it's the fastest processing).
* "**strategy**": When a *source* is defined, there are three different ways to merge it in the *target*.
    * "**replace**": The *target* node is replaced by the *source* node. It's the fastest strategy (as long as a *source* is defined; it's even faster when no *source* is defined).
    * "**fill**": The *target* node's content is deleted, and then the *source* node is placed inside the *target* node.
    * "**copy**": The *target* node's content is deleted, and then the content of the *source* node is copied inside the *target* node. It's the slowest strategy.
* "**callbacks**": It is possible to configure Vik in order to execute some functions before and/or after fetching a page. A common usage may be to display a "spinning wheel" before fetching the page, to let the user know something is going on, and then remove it after the page has been fetched.
    * The "pre callback" is executed before fetching a page.
    * The "post callback" is executed after a page has been fetched. It is also called during Vik's initialization and, after that, each time a new page is fetched. So if you need to initialize some front-end Javascript libraries, it is the right place to do it.
* "**events**": Similarly to callbacks, your code can bind to `vik:preLoad` and `vik.postLoad` events, to be executed before and after fetching a page.
    * `vik:preLoad` is triggered before fetching a page (but after "pre callback" execution). If the event is canceled at least once (see below), the page will not be loaded.
    * `vik:postLoad` is triggered when Vik is initialized, and after a page has been fetched. This event is not cancelable.

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
* `linksSelector` (string): Selector used to fetch the links to modify. (shouldn't be modified unless you know what you are doing)
* `processForms` (boolean): Tell if form (`<form>` tags) must be processed. (default: `true`)
* `formsSelector` (string): Selector used to fetch forms. (shouldn't be modified unless you know what you are doing)
* `ghost` (boolean): Tell if loadings should be in ghost mode (no addition in history). (default: `false` in general, and `true` for POST forms)
* `postMethod` (bool): Set to `true` to force the POST HTTP method when a link is fetched (no effect on forms).
* `preCallback` (function|array): Handler to call before the page has been loaded. Could be a function name or an anonymous function, or a list of function names and/or anonymous functions.
* `postCallback` (function|array): Handler to call after the page has been loaded. Could be a function name or an anonymous function, or a list of function names and/or anonymous functions.
* `strategy` (string): Merging strategy, could be "`replace`", "`fill`" or "`copy`". (default: "`replace`")
    * `replace`: The target node is replaced by the source node.
    * `fill`: The source node is copied inside the target node.
    * `copy`: The content of the source node is copied inside the target node.
* `target` (string): Selector of the current page's element which will be the target of the managed links. (default: "`body`")
* `source` (string): Selector of the response's element which will contain the HTML to load. If this parameter is set to null or if the element is not found, the whole response will be used. (default: "`body`")
* `scrollToTop` (boolean): If set to `true`, always scroll to the top of the page when a page is fetched, even if the ghost mode was activated. If set to `false`, never scroll to the top of the page, even if the ghost mode was deactivated. (default: `false` if ghost mode was activated)
* `urlPrefix` (string): Prefix to add on fetched URLs. (default: `null`)
* `title` (string): Selector of the node which contains the page title. If empty, the page title will not be updated. If the title's text is stored in an attribute of the node (instead of the node's text content), the attribute's name must be added at the end of the selector, separated by a slash. (default: "`title`")
* `manageQuitPageConfirmation` (boolean): Tell if a confirmation popup should be displayed when the user tries to quit the current page whereas a form has begun to be filled. See below for more information. (default: `true`)
* `quitPageConfirmationText` (string): Text used for the confirmation box before leaving the page. (default: "`Are you sure you want to leave this page?`"; but browsers usually override it)


### 3.2 Configuration of links and forms
It is possible to add special attributes to a link (or a form) tag, to modify its behavior.

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
* `data-vik-url`: Force a URL different than the one set in the `href` or `action` attribute.
* `data-vik-post-method`: Set to `true`" to force the POST HTTP method when a link is fetched (forms use the "`method`" attribute to define the used HTTP method).
* `data-vik-ghost`: Tell if the "ghost mode" must be used. Possible values are "`true`" or "`false`".
* `data-vik-strategy`: Merging strategy. Possible values are "`replace`", "`fill`" or "`copy`".
* `data-vik-target`: Selector of the DOM element (in the current page) that will be replaced by (or filled by) the fetched content.
* `data-vik-source`: Selector of the DOM element (in the fetched page) that will replace (or fill into, or be copied into) the target node.
* `data-vik-pre-callback`: Name of a Javascript function to execute *before* the new content will be fetched.
* `data-vik-post-callback`: Name of a Javascript function to execute *after* the new content has been fetched.
* `data-vik-title`: Selector of the DOM element which contains the new title of the page. If the title's text is stored in an attribute of the node (instead of the node's text content), the attribute's name must be added at the end of the selector, separated by a slash. Set to an empty string to avoid title update.
* `data-vik-scroll-to-top`: "`false`" to prevent scrolling to the top of the page. "`true`" to scroll to the top of the page (even if the ghost mode was activated, or if it is a POST form).
* `data-vik-quit-page-confirmation`: **Forms only.** Tell if a confirmation popup should be displayed when the user tries to quit the current page whereas this form has begun to be filled. Possible values are "`true`" or "`false`".
* `data-vik-quit-page-text`: **Forms only.** Text used for the confirmation popup before leaving the page. (browsers usually override it)
* `data-vik-form-validation`: **Forms only.** Name of a Javascript function to execute in order to validate the form's content. The function will receive the form's DOM element as a parameter, and must return a boolean value (`true` if the form is valid and could be sent; `false` if the form contains errors).

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

Another example: All the linked pages' full content will be loaded in a special `<div>`, and the page's title will not be updated. But for one link, its `<body>` tag will replace the current page's `<body>` tag, and the fetched page's title will be used (so the default behavior become a special behavior).
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
Vik may be used to load pages without having a dedicated link in the page, by calling it from Javascript code. To do so, your code can call the `vik.load()` function, giving the URL as its first parameter. Configuration could be given as the second parameter, with the same keys as the initialization.

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

### 4.2 Get the last URLs loaded by Vik
The `vik.getLastUrl()` method returns the URL of the last page loaded by Vik. If Vik wasn't used yet, it returns `null`.
It could be used in the "post callback", to know if it is called during Vik's initialization, or because a link was clicked (or a form was sent).

Example:
```html
<html>
<body>

    <script>
        // Vik init
        vik.ini({
            // post callback function
            postCallback: function() {
                // get the last fetched URL
                var lastUrl = vik.getLastUrl();
                if (!lastUrl) {
                    // no previously fetched page, so it's Vik init
                    return;
                }
                // a page was fetched, so it's time to do some processing
                // like menu management, Google Analytics management, and so on
            }
        });
    </script>
</body>
</html>
```

The `vik.getPreviousUrl()` method returns the URL previous to the last one. It returns `null` as long as Vik hasn't loaded at least two pages.

Instead of calling these methods, it's also possible to use the `detail.lastUrl` and `detail.previousUrl` attributes from the event.

Example:
```html
<html>
<body>

    <script>
        // Vik init
        vik.ini({
            // post callback function
            postCallback: function(e) {
                // write the last fetched URL
                console.log(e.detail.lastUrl);
                // write the previous URL
                console.log(e.detail.previousUrl);
            }
        });
    </script>
</body>
</html>
```

### 4.3 Confirmation when the current page is exited
It is possible to tell Vik to enable or disable the "quit page confirmation" feature, by calling the `vik.setQuitPageConfirmation()` function, giving a boolean as its parameter (`true` to enable, `false` to disable the feature).

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


## 5. Utility functions
### 5.1 Execute code when the page is loaded
You may need to execute some code once the full HTML page is loaded. If you are using the jQuery library, you can use the `$(document).ready()` function.
But if you want to stay free from jQuery dependency, you can use the `vik.onDocumentReady()` function.

Example:
```html
<html>
<body>

    <script>
        // execute the given anonymous function when the page is loaded
        vik.onDocumentReady(function() {
            // some code
        });
    </script>

</body>
</html>
```

### 5.2 Overload an object with the content of another one
This utility method is used to overload and extend an object with the content of another object.

If an attribute exists only in the first object, it is not modified.
If an attribute exists only in the second object, it is added to the first object with its associated value.
If an attribute exists in both objects, the content of the associated value in the second object will overwrite the value in the first object.

Warning: The first object given as a parameter may be modified by this function.

Example:
```html
<html>
<body>

    <script>
        // create two objects
        var a = {
            foo: 123,
            bar: "abc"
        };
        var b = {
            foo: 456,
            baz: "zyx"
        };
        // object overloading
        vik.overloadObject(a, b);

        // now the first object is:
        // a = {
        //     foo: 456,
        //     bar: "abc",
        //     baz: "zyx"
        // };
    </script>

</body>
</html>
```

### 5.3 Make an HTTP request
You may want to do an HTTP request, without dealing with all the related stuff.

To do that, you can call the `vik.fetchHttp(url, strategy, asHTML, postData, handler)` method.
Parameters:
* `url`: The URL to fetch.
* `strategy`: The Vik strategy. It is sent in a special `x-vik-strategy` HTTP header. You can set it to `null`.
* `asHTML`: Possible values are `true` and `false`. If set to `true`, the fetched content will be processed as HTML, and then the handler callback will receive a DOM node as a parameter. If set to `false`, the handler callback will receive the reponse as raw text.
* `postData`: Set it to `null` if you want to perform a GET request. If you want to make a POST request, give an object which each attribute will become a POST data.
* `handler`: Callback function that will be called once the HTTP request is executed. It must take one parameter, which can be a DOM node or a raw text (see the `asHTML` parameter).

Example:
```html
<html>
<body id="page-body">

    <script>
        // perform a GET request on a text file, and display its content on the console
        vik.fetchHttp("/path/to/file.txt", null, false, null, function(txt) {
            console.log(txt);
        });

        // perform a POST request, and write the returned HTML in the current page
        var postParams = {
            publicKey: "some key",
            privateKey: "some random key"
        };
        vik.fetchHttp("/url1", null, true, postParams, function(responseNode) {
            var body = document.getElementById("page-body");
            body.appendChild(responseNode);
        });
    </script>

</body>
</html>
```

