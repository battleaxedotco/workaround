/**
 * Since ILST 25.3 (AUG 2021) new CORS updates for Chromium 88 are implemented in CEP.
 * One byproduct of this is that iframes can no longer receive evalScript return values or access parent document contents, so the DEVELOPER context
 * within older bombino templates must be altered to use window.postMessage event chain in order to invoke evalScript and return values correctly.
 *
 * This particular file is specifically meant to work in tandem with Inventsable/workaround and the evalScript() method contained within.
 * If you find a bug, please report it to Inventsable/bombino (unless isolated to this particular template in which case feel free to issue one here)
 */
const DEBUG = false; // If you have multiple depths of iframes, setting DEBUG to true and tracing the event chain may help us debug.

/**
 * We don't need an event chain for PRODUCTION context. This code is specifically meant to assist DEVELOPER since we embed our localhost port via iframe within index-dev.html
 */
const CSI = new CSInterface();
// NOTE: You won't see this in bombino unless you have a <Panel debug> or <Panel keep-console> prop, since console is cleared on mounting lifecycle.
if (DEBUG) {
  console.log(
    "createEventChain.js booted, eventListener for child evalScripts is now live:"
  );
}

/**
 * Global window listener should catch any children messages propagating upwards, then pass to a global evalScript
 */
window.addEventListener("message", (msg) => {
  if (DEBUG) {
    console.log("Outer shell receives message");
    console.log(msg);
  }
  // A default message will arrive with an "evalScript" key for any child evalScript invocations:
  if (msg.data && msg.data.evalScript && msg.data.uuid) {
    evalScript(msg.data.evalScript).then((result) => {
      if (DEBUG && result + "" !== "undefined") {
        console.log("RESULT:");
        console.log(result, msg.data.uuid, msg.origin);
        console.log(msg.data.uuid);
      }
      /**
       * This document should be barebones if index-dev.html has not been altered, so querying an iframe should be trivial
       */
      let target = getIframe();
      if (target && target.contentWindow) {
        if (DEBUG)
          console.log("SEND TO CHILD:", {
            evalScriptResult: result,
            uuid: msg.data.uuid,
            origin: msg.data.origin,
          });
        // We then post a message back to the child with the result and original uuid
        target.contentWindow.postMessage(
          {
            evalScriptResult: result,
            uuid: msg.data.uuid,
            origin: msg.data.origin,
          },
          msg.origin
        );
      } else {
        console.error("Could not find iframe");
      }
    });

    // Otherwise this may be for a menu like a context or flyout option, containing uuid and type keys
  } else if (msg.data && msg.data.uuid && msg.data.type) {
    let target = getIframe();
    if (DEBUG) {
      console.log("");
      console.log("ROOT RECEIVED A MENU MESSAGE:");
      console.log(msg.data.type);
      console.log("");
    }
    // If the type is Context menu:
    if (msg.data.type == "setContextMenu") {
      if (DEBUG) console.log("BUILDING CONTEXT MENU");
      window.__adobe_cep__.invokeAsync(
        msg.data.params[0],
        msg.data.params[1],
        (evt) => {
          if (DEBUG) {
            console.log("CLICKED:");
            console.log(evt);
            console.log(target);
          }
          target.contentWindow.postMessage(
            {
              type: "contextMenuClicked",
              uuid: msg.data.uuid,
              origin: msg.data.origin,
              menuItem: evt,
            },
            msg.origin
          );
        }
      );
    }
    // If the type is flyout menu:
    // } else if (msg.data.type == "setPanelFlyoutMenu") {
    //   if (DEBUG) console.log("SET FLYOUT MENU?");
    //   window.__adobe_cep__.invokeSync("setPanelFlyoutMenu", msg.data.params[1]);
    //   window.__adobe_cep__.addEventListener(
    //     "com.adobe.csxs.events.flyoutMenuClicked",
    //     (evt) => {
    //       if (DEBUG) {
    //         console.log("FLYOUT CLICK:");
    //         console.log(evt);
    //       }
    //       target.contentWindow.postMessage(
    //         {
    //           type: "contextMenuClicked",
    //           uuid: msg.data.uuid,
    //           origin: msg.data.origin,
    //           menuItem: evt,
    //         },
    //         msg.origin
    //       );
    //     }
    //   );
    // }
  }
});

function getIframe() {
  let target = document.querySelector("iframe");
  return target || null;
}

// Nearly identical to the vanilla evalScript from brutalism and cluecumber here, but using the full reference to host instead of CEP-Spy
// We know this can always be a vanilla evalScript since this should only exist in the startup / onload files of our raw panel HTML
async function evalScript(text, defs = {}) {
  if (window.__adobe_cep__) {
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
          resolve(this.isJson(res) ? JSON.parse(res) : res);
        }
      });
    });
  } else {
    console.error("evalScript() attempting to return at wrong depth");
    return null;
  }
}

// Automatic JSON parsing on certain host apps
function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (err) {
    return false;
  }
}
