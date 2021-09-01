/**
 * Unfortunately, this does not yet support multiple depths of iframes. I'll be looking to support that but need a more reliable
 * solution prior to spending time on it.
 */

// When set to true (or passed in as options.debug), displays console information
const DEBUG = false;

/**
 * Async/thenable method to return evalScript results regardless of context (within iframe or not)
 *
 * @param {String} text The JSX string to send to host application
 * @param {Object} options Placeholder for additional options
 * @returns {Any} The evaluated result from JSX invocation
 */
async function evalScript(text, options) {
  if (DEBUG || (options && options.debug)) {
    console.log("EVAL:", text);
    console.log("CONTEXT:", isVanillaContext() ? "ROOT" : "CHILD IFRAME");
  }
  // If this isn't in an iframe, treat it like some normal evalScript call
  if (isVanillaContext()) return await vanillaEvalscript(text, options);
  // Otherwise, we need to use postMessage() between iframe and parent to evalScript correctly
  else return await parentEvalScript(text, options);
}

/**
 * Utility function for passing iframe evalScript calls upwards to ancestors
 *
 * @param {String} text The JSX string to send to host application
 * @param {Object} options Placeholder for additional options
 * @returns {Any} The evaluated result from JSX invocation
 */
async function parentEvalScript(text, options) {
  return new Promise((resolve, reject) => {
    const uuid = options && options.uuid ? options.uuid : getUUID();
    parent.postMessage(
      {
        evalScript: text,
        uuid: uuid,
      },
      "*"
    );
    let parentReturn; // This is somewhat hacky
    /**
     * We can't use { once: true } below reliably because events seem to be duplicated and our listener will close
     * if it received a false or prior event unrelated to the one it *should* be targeting.
     *
     * To solve this, we have the listener close itself only if/when it receives an event with the matching UUID of
     * the original emitter. I don't know of a more elegant way to do this, so I assign the callback to a "hacky"
     * variable above and have it remove itself prior to the resolve() callback. I don't want to reject() on
     * duplicates because then the Promise will return and our code awaiting this return will execute.
     */
    window.addEventListener(
      "message",
      (parentReturn = (evt) => {
        if (
          evt.data &&
          evt.data.evalScriptResult &&
          evt.data.uuid &&
          evt.data.uuid == uuid
        ) {
          if (DEBUG || (options && options.debug)) {
            console.log(
              "RECEIVED CORRECT EVALSCRIPT RESULT:",
              evt.data.evalScriptResult
            );
          }
          window.removeEventListener("message", parentReturn); // We need to remove this listener
          resolve(evt.data.evalScriptResult);
        } else {
          /**
           * I've continually gotten duplicated results, where the parent is posting multiple times to the child.
           * I don't understand why this is happening -- is it CEP 11? Vue 2x? Not sure. You can see it yourself
           * by enabling DEBUG, and notice that this listener will catch prior invocations of evalScript results.
           *
           * This was causing a lot of desync issues, where my code was returning false results (or prior results).
           */
          if (DEBUG || (options && options.debug))
            console.error(`NO MATCH ON UUID "${uuid}"`, evt);
        }
      })
    );
  });
}

/**
 * Utility function for plain evalScript invocation when not inside an iframe
 *
 * @param {String} text The JSX string to send to host application
 * @param {Object} options Placeholder for additional options
 * @returns {Any} The evaluated result from JSX invocation
 */
async function vanillaEvalscript(text, debug = false) {
  if (window.__adobe_cep__ || CSInterface) {
    const CSI = new CSInterface();
    return new Promise((resolve, reject) => {
      CSI.evalScript(`${text}`, (res) => {
        // For some reason this was returning errors in InDesign alone. No idea why
        if (
          /idsn/i.test(
            JSON.parse(window.__adobe_cep__.getHostEnvironment()).appName
          )
        ) {
          resolve(res);
        } else {
          resolve(isJson(res) ? JSON.parse(res) : res);
        }
      });
    });
  } else {
    // This should never happen unless the user invokes this in some extension where they haven't loaded CSInterface
    console.error(
      "CSInterface does not exist in this scope:",
      CSInterface,
      "Are you sure CSInterface.js is correctly loaded into this extension prior to evalScript calls?"
    );
    return Promise.reject(
      "CSInterface does not exist within the current scope"
    );
  }
}

/**
 * Helper for determining current evalScript context
 *
 * @returns {Boolean} If false, evalScript is being called within an iframe
 */
function isVanillaContext() {
  return /^file:\/\//i.test(document.location.href);
}

/**
 * Simple UUID generation to ensure events aren't entangled and return false (or prior) results
 * @returns {String} Unique user identifier number
 */
function getUUID() {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple utility for determining if evalScript should auto-parse JSON results
 * @param {String} text Text to determine if valid JSON format
 * @returns {Boolean} Whether text is valid JSON
 */
function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (err) {
    return false;
  }
}

export { evalScript };
