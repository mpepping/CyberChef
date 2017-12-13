import Utils from "../core/Utils.js";
import Manager from "./Manager.js";
import HTMLCategory from "./HTMLCategory.js";
import HTMLOperation from "./HTMLOperation.js";
import Split from "split.js";


/**
 * HTML view for CyberChef responsible for building the web page and dealing with all user
 * interactions.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 *
 * @constructor
 * @param {CatConf[]} categories - The list of categories and operations to be populated.
 * @param {Object.<string, OpConf>} operations - The list of operation configuration objects.
 * @param {String[]} defaultFavourites - A list of default favourite operations.
 * @param {Object} options - Default setting for app options.
 */
const App = function(categories, operations, defaultFavourites, defaultOptions) {
    this.categories    = categories;
    this.operations    = operations;
    this.dfavourites   = defaultFavourites;
    this.doptions      = defaultOptions;
    this.options       = Utils.extend({}, defaultOptions);

    this.manager       = new Manager(this);

    this.baking        = false;
    this.autoBake_     = false;
    this.autoBakePause = false;
    this.progress      = 0;
    this.ingId         = 0;
};


/**
 * This function sets up the stage and creates listeners for all events.
 *
 * @fires Manager#appstart
 */
App.prototype.setup = function() {
    document.dispatchEvent(this.manager.appstart);
    this.initialiseSplitter();
    this.loadLocalStorage();
    this.populateOperationsList();
    this.manager.setup();
    this.resetLayout();
    this.setCompileMessage();
    this.loadURIParams();

    this.appLoaded = true;
    this.loaded();
};


/**
 * Fires once all setup activities have completed.
 *
 * @fires Manager#apploaded
 */
App.prototype.loaded = function() {
    // Check that both the app and the worker have loaded successfully, and that
    // we haven't already loaded before attempting to remove the loading screen.
    if (!this.workerLoaded || !this.appLoaded ||
        !document.getElementById("loader-wrapper")) return;

    // Trigger CSS animations to remove preloader
    document.body.classList.add("loaded");

    // Wait for animations to complete then remove the preloader and loaded style
    // so that the animations for existing elements don't play again.
    setTimeout(function() {
        document.getElementById("loader-wrapper").remove();
        document.body.classList.remove("loaded");
    }, 1000);

    // Clear the loading message interval
    clearInterval(window.loadingMsgsInt);

    document.dispatchEvent(this.manager.apploaded);
};


/**
 * An error handler for displaying the error to the user.
 *
 * @param {Error} err
 * @param {boolean} [logToConsole=false]
 */
App.prototype.handleError = function(err, logToConsole) {
    if (logToConsole) console.error(err);
    const msg = err.displayStr || err.toString();
    this.alert(msg, "danger", this.options.errorTimeout, !this.options.showErrors);
};


/**
 * Asks the ChefWorker to bake the current input using the current recipe.
 *
 * @param {boolean} [step] - Set to true if we should only execute one operation instead of the
 *   whole recipe.
 */
App.prototype.bake = function(step) {
    if (this.baking) return;

    // Reset attemptHighlight flag
    this.options.attemptHighlight = true;

    this.manager.worker.bake(
        this.getInput(),        // The user's input
        this.getRecipeConfig(), // The configuration of the recipe
        this.options,           // Options set by the user
        this.progress,          // The current position in the recipe
        step                    // Whether or not to take one step or execute the whole recipe
    );
};


/**
 * Runs Auto Bake if it is set.
 */
App.prototype.autoBake = function() {
    // If autoBakePause is set, we are loading a full recipe (and potentially input), so there is no
    // need to set the staleness indicator. Just exit and wait until auto bake is called after loading
    // has completed.
    if (this.autoBakePause) return false;

    if (this.autoBake_ && !this.baking) {
        this.bake();
    } else {
        this.manager.controls.showStaleIndicator();
    }
};


/**
 * Runs a silent bake, forcing the browser to load and cache all the relevant JavaScript code needed
 * to do a real bake.
 *
 * The output will not be modified (hence "silent" bake). This will only actually execute the recipe
 * if auto-bake is enabled, otherwise it will just wake up the ChefWorker with an empty recipe.
 */
App.prototype.silentBake = function() {
    let recipeConfig = [];

    if (this.autoBake_) {
        // If auto-bake is not enabled we don't want to actually run the recipe as it may be disabled
        // for a good reason.
        recipeConfig = this.getRecipeConfig();
    }

    this.manager.worker.silentBake(recipeConfig);
};


/**
 * Gets the user's input data.
 *
 * @returns {string}
 */
App.prototype.getInput = function() {
    return this.manager.input.get();
};


/**
 * Sets the user's input data.
 *
 * @param {string} input - The string to set the input to
 */
App.prototype.setInput = function(input) {
    this.manager.input.set(input);
};


/**
 * Populates the operations accordion list with the categories and operations specified in the
 * view constructor.
 *
 * @fires Manager#oplistcreate
 */
App.prototype.populateOperationsList = function() {
    // Move edit button away before we overwrite it
    document.body.appendChild(document.getElementById("edit-favourites"));

    let html = "";
    let i;

    for (i = 0; i < this.categories.length; i++) {
        let catConf = this.categories[i],
            selected = i === 0,
            cat = new HTMLCategory(catConf.name, selected);

        for (let j = 0; j < catConf.ops.length; j++) {
            let opName = catConf.ops[j],
                op = new HTMLOperation(opName, this.operations[opName], this, this.manager);
            cat.addOperation(op);
        }

        html += cat.toHtml();
    }

    document.getElementById("categories").innerHTML = html;

    const opLists = document.querySelectorAll("#categories .op-list");

    for (i = 0; i < opLists.length; i++) {
        opLists[i].dispatchEvent(this.manager.oplistcreate);
    }

    // Add edit button to first category (Favourites)
    document.querySelector("#categories a").appendChild(document.getElementById("edit-favourites"));
};


/**
 * Sets up the adjustable splitter to allow the user to resize areas of the page.
 */
App.prototype.initialiseSplitter = function() {
    this.columnSplitter = Split(["#operations", "#recipe", "#IO"], {
        sizes: [20, 30, 50],
        minSize: [240, 325, 450],
        gutterSize: 4,
        onDrag: function() {
            this.manager.controls.adjustWidth();
            this.manager.output.adjustWidth();
        }.bind(this)
    });

    this.ioSplitter = Split(["#input", "#output"], {
        direction: "vertical",
        gutterSize: 4,
    });

    this.resetLayout();
};


/**
 * Loads the information previously saved to the HTML5 local storage object so that user options
 * and favourites can be restored.
 */
App.prototype.loadLocalStorage = function() {
    // Load options
    let lOptions;
    if (this.isLocalStorageAvailable() && localStorage.options !== undefined) {
        lOptions = JSON.parse(localStorage.options);
    }
    this.manager.options.load(lOptions);

    // Load favourites
    this.loadFavourites();
};


/**
 * Loads the user's favourite operations from the HTML5 local storage object and populates the
 * Favourites category with them.
 * If the user currently has no saved favourites, the defaults from the view constructor are used.
 */
App.prototype.loadFavourites = function() {
    let favourites;

    if (this.isLocalStorageAvailable()) {
        favourites = localStorage.favourites && localStorage.favourites.length > 2 ?
            JSON.parse(localStorage.favourites) :
            this.dfavourites;
        favourites = this.validFavourites(favourites);
        this.saveFavourites(favourites);
    } else {
        favourites = this.dfavourites;
    }

    const favCat = this.categories.filter(function(c) {
        return c.name === "Favourites";
    })[0];

    if (favCat) {
        favCat.ops = favourites;
    } else {
        this.categories.unshift({
            name: "Favourites",
            ops: favourites
        });
    }
};


/**
 * Filters the list of favourite operations that the user had stored and removes any that are no
 * longer available. The user is notified if this is the case.

 * @param {string[]} favourites - A list of the user's favourite operations
 * @returns {string[]} A list of the valid favourites
 */
App.prototype.validFavourites = function(favourites) {
    const validFavs = [];
    for (let i = 0; i < favourites.length; i++) {
        if (this.operations.hasOwnProperty(favourites[i])) {
            validFavs.push(favourites[i]);
        } else {
            this.alert("The operation \"" + Utils.escapeHtml(favourites[i]) +
                "\" is no longer available. It has been removed from your favourites.", "info");
        }
    }
    return validFavs;
};


/**
 * Saves a list of favourite operations to the HTML5 local storage object.
 *
 * @param {string[]} favourites - A list of the user's favourite operations
 */
App.prototype.saveFavourites = function(favourites) {
    if (!this.isLocalStorageAvailable()) {
        this.alert(
            "Your security settings do not allow access to local storage so your favourites cannot be saved.",
            "danger",
            5000
        );
        return false;
    }

    localStorage.setItem("favourites", JSON.stringify(this.validFavourites(favourites)));
};


/**
 * Resets favourite operations back to the default as specified in the view constructor and
 * refreshes the operation list.
 */
App.prototype.resetFavourites = function() {
    this.saveFavourites(this.dfavourites);
    this.loadFavourites();
    this.populateOperationsList();
    this.manager.recipe.initialiseOperationDragNDrop();
};


/**
 * Adds an operation to the user's favourites.
 *
 * @param {string} name - The name of the operation
 */
App.prototype.addFavourite = function(name) {
    const favourites = JSON.parse(localStorage.favourites);

    if (favourites.indexOf(name) >= 0) {
        this.alert("'" + name + "' is already in your favourites", "info", 2000);
        return;
    }

    favourites.push(name);
    this.saveFavourites(favourites);
    this.loadFavourites();
    this.populateOperationsList();
    this.manager.recipe.initialiseOperationDragNDrop();
};


/**
 * Checks for input and recipe in the URI parameters and loads them if present.
 */
App.prototype.loadURIParams = function() {
    // Load query string or hash from URI (depending on which is populated)
    // We prefer getting the hash by splitting the href rather than referencing
    // location.hash as some browsers (Firefox) automatically URL decode it,
    // which cause issues.
    const params = window.location.search ||
        window.location.href.split("#")[1] ||
        window.location.hash;
    this.uriParams = Utils.parseURIParams(params);

    // Read in recipe from URI params
    if (this.uriParams.recipe) {
        try {
            const recipeConfig = Utils.parseRecipeConfig(this.uriParams.recipe);
            this.setRecipeConfig(recipeConfig);
        } catch (err) {}
    } else if (this.uriParams.op) {
        // If there's no recipe, look for single operations
        this.manager.recipe.clearRecipe();
        try {
            this.manager.recipe.addOperation(this.uriParams.op);
        } catch (err) {
            // If no exact match, search for nearest match and add that
            const matchedOps = this.manager.ops.filterOperations(this.uriParams.op, false);
            if (matchedOps.length) {
                this.manager.recipe.addOperation(matchedOps[0].name);
            }

            // Populate search with the string
            const search = document.getElementById("search");

            search.value = this.uriParams.op;
            search.dispatchEvent(new Event("search"));
        }
    }

    // Read in input data from URI params
    if (this.uriParams.input) {
        this.autoBakePause = true;
        try {
            const inputData = Utils.fromBase64(this.uriParams.input);
            this.setInput(inputData);
        } catch (err) {
        } finally {
            this.autoBakePause = false;
        }
    }

    this.autoBake();
};


/**
 * Returns the next ingredient ID and increments it for next time.
 *
 * @returns {number}
 */
App.prototype.nextIngId = function() {
    return this.ingId++;
};


/**
 * Gets the current recipe configuration.
 *
 * @returns {Object[]}
 */
App.prototype.getRecipeConfig = function() {
    return this.manager.recipe.getConfig();
};


/**
 * Given a recipe configuration, sets the recipe to that configuration.
 *
 * @param {Object[]} recipeConfig - The recipe configuration
 */
App.prototype.setRecipeConfig = function(recipeConfig) {
    document.getElementById("rec-list").innerHTML = null;

    // Pause auto-bake while loading but don't modify `this.autoBake_`
    // otherwise `manualBake` cannot trigger.
    this.autoBakePause = true;

    for (let i = 0; i < recipeConfig.length; i++) {
        const item = this.manager.recipe.addOperation(recipeConfig[i].op);

        // Populate arguments
        const args = item.querySelectorAll(".arg");
        for (let j = 0; j < args.length; j++) {
            if (recipeConfig[i].args[j] === undefined) continue;
            if (args[j].getAttribute("type") === "checkbox") {
                // checkbox
                args[j].checked = recipeConfig[i].args[j];
            } else if (args[j].classList.contains("toggle-string")) {
                // toggleString
                args[j].value = recipeConfig[i].args[j].string;
                args[j].previousSibling.children[0].innerHTML =
                    Utils.escapeHtml(recipeConfig[i].args[j].option) +
                    " <span class='caret'></span>";
            } else {
                // all others
                args[j].value = recipeConfig[i].args[j];
            }
        }

        // Set disabled and breakpoint
        if (recipeConfig[i].disabled) {
            item.querySelector(".disable-icon").click();
        }
        if (recipeConfig[i].breakpoint) {
            item.querySelector(".breakpoint").click();
        }

        this.progress = 0;
    }

    // Unpause auto bake
    this.autoBakePause = false;
};


/**
 * Resets the splitter positions to default.
 */
App.prototype.resetLayout = function() {
    this.columnSplitter.setSizes([20, 30, 50]);
    this.ioSplitter.setSizes([50, 50]);

    this.manager.controls.adjustWidth();
    this.manager.output.adjustWidth();
};


/**
 * Sets the compile message.
 */
App.prototype.setCompileMessage = function() {
    // Display time since last build and compile message
    let now = new Date(),
        timeSinceCompile = Utils.fuzzyTime(now.getTime() - window.compileTime);

    // Calculate previous version to compare to
    let prev = PKG_VERSION.split(".").map(n => {
        return parseInt(n, 10);
    });
    if (prev[2] > 0) prev[2]--;
    else if (prev[1] > 0) prev[1]--;
    else prev[0]--;

    const compareURL = `https://github.com/gchq/CyberChef/compare/v${prev.join(".")}...v${PKG_VERSION}`;

    let compileInfo = `<a href='${compareURL}'>Last build: ${timeSinceCompile.substr(0, 1).toUpperCase() + timeSinceCompile.substr(1)} ago</a>`;

    if (window.compileMessage !== "") {
        compileInfo += " - " + window.compileMessage;
    }

    document.getElementById("notice").innerHTML = compileInfo;
};


/**
 * Determines whether the browser supports Local Storage and if it is accessible.
 * 
 * @returns {boolean}
 */
App.prototype.isLocalStorageAvailable = function() {
    try {
        if (!localStorage) return false;
        return true;
    } catch (err) {
        // Access to LocalStorage is denied
        return false;
    }
};


/**
 * Pops up a message to the user and writes it to the console log.
 *
 * @param {string} str - The message to display (HTML supported)
 * @param {string} style - The colour of the popup
 *     "danger"  = red
 *     "warning" = amber
 *     "info"    = blue
 *     "success" = green
 * @param {number} timeout - The number of milliseconds before the popup closes automatically
 *     0 for never (until the user closes it)
 * @param {boolean} [silent=false] - Don't show the message in the popup, only print it to the
 *     console
 *
 * @example
 * // Pops up a red box with the message "[current time] Error: Something has gone wrong!"
 * // that will need to be dismissed by the user.
 * this.alert("Error: Something has gone wrong!", "danger", 0);
 *
 * // Pops up a blue information box with the message "[current time] Happy Christmas!"
 * // that will disappear after 5 seconds.
 * this.alert("Happy Christmas!", "info", 5000);
 */
App.prototype.alert = function(str, style, timeout, silent) {
    const time = new Date();

    console.log("[" + time.toLocaleString() + "] " + str);
    if (silent) return;

    style = style || "danger";
    timeout = timeout || 0;

    let alertEl = document.getElementById("alert"),
        alertContent = document.getElementById("alert-content");

    alertEl.classList.remove("alert-danger");
    alertEl.classList.remove("alert-warning");
    alertEl.classList.remove("alert-info");
    alertEl.classList.remove("alert-success");
    alertEl.classList.add("alert-" + style);

    // If the box hasn't been closed, append to it rather than replacing
    if (alertEl.style.display === "block") {
        alertContent.innerHTML +=
            "<br><br>[" + time.toLocaleTimeString() + "] " + str;
    } else {
        alertContent.innerHTML =
            "[" + time.toLocaleTimeString() + "] " + str;
    }

    // Stop the animation if it is in progress
    $("#alert").stop();
    alertEl.style.display = "block";
    alertEl.style.opacity = 1;

    if (timeout > 0) {
        clearTimeout(this.alertTimeout);
        this.alertTimeout = setTimeout(function(){
            $("#alert").slideUp(100);
        }, timeout);
    }
};


/**
 * Pops up a box asking the user a question and sending the answer to a specified callback function.
 *
 * @param {string} title - The title of the box
 * @param {string} body - The question (HTML supported)
 * @param {function} callback - A function accepting one boolean argument which handles the
 *   response e.g. function(answer) {...}
 * @param {Object} [scope=this] - The object to bind to the callback function
 *
 * @example
 * // Pops up a box asking if the user would like a cookie. Prints the answer to the console.
 * this.confirm("Question", "Would you like a cookie?", function(answer) {console.log(answer);});
 */
App.prototype.confirm = function(title, body, callback, scope) {
    scope = scope || this;
    document.getElementById("confirm-title").innerHTML = title;
    document.getElementById("confirm-body").innerHTML = body;
    document.getElementById("confirm-modal").style.display = "block";

    this.confirmClosed = false;
    $("#confirm-modal").modal()
        .one("show.bs.modal", function(e) {
            this.confirmClosed = false;
        }.bind(this))
        .one("click", "#confirm-yes", function() {
            this.confirmClosed = true;
            callback.bind(scope)(true);
            $("#confirm-modal").modal("hide");
        }.bind(this))
        .one("hide.bs.modal", function(e) {
            if (!this.confirmClosed)
                callback.bind(scope)(false);
            this.confirmClosed = true;
        }.bind(this));
};


/**
 * Handler for the alert close button click event.
 * Closes the alert box.
 */
App.prototype.alertCloseClick = function() {
    document.getElementById("alert").style.display = "none";
};


/**
 * Handler for CyerChef statechange events.
 * Fires whenever the input or recipe changes in any way.
 *
 * @listens Manager#statechange
 * @param {event} e
 */
App.prototype.stateChange = function(e) {
    this.autoBake();

    // Set title
    const recipeConfig = this.getRecipeConfig();
    let title = "CyberChef";
    if (recipeConfig.length === 1) {
        title = `${recipeConfig[0].op} - ${title}`;
    } else if (recipeConfig.length > 1) {
        // See how long the full recipe is
        const ops = recipeConfig.map(op => op.op).join(", ");
        if (ops.length < 45) {
            title = `${ops} - ${title}`;
        } else {
            // If it's too long, just use the first one and say how many more there are
            title = `${recipeConfig[0].op}, ${recipeConfig.length - 1} more - ${title}`;
        }
    }
    document.title = title;

    // Update the current history state (not creating a new one)
    if (this.options.updateUrl) {
        this.lastStateUrl = this.manager.controls.generateStateUrl(true, true, recipeConfig);
        window.history.replaceState({}, title, this.lastStateUrl);
    }
};


/**
 * Handler for the history popstate event.
 * Reloads parameters from the URL.
 *
 * @param {event} e
 */
App.prototype.popState = function(e) {
    this.loadURIParams();
};


/**
 * Function to call an external API from this view.
 */
App.prototype.callApi = function(url, type, data, dataType, contentType) {
    type = type || "POST";
    data = data || {};
    dataType = dataType || undefined;
    contentType = contentType || "application/json";

    let response = null,
        success = false;

    $.ajax({
        url: url,
        async: false,
        type: type,
        data: data,
        dataType: dataType,
        contentType: contentType,
        success: function(data) {
            success = true;
            response = data;
        },
        error: function(data) {
            success = false;
            response = data;
        },
    });

    return {
        success: success,
        response: response
    };
};

export default App;
