async function vanillaEvalscript(text, debug = false) {
  if (window.__adobe_cep__ || CSInterface) {
    let CS_Interface = new CSInterface();
    return new Promise((resolve, reject) => {
      CS_Interface.evalScript(`${text}`, (res) => {
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
    console.error("CSInterface does not exist in this scope:", CSInterface);
    return Promise.reject(
      "CSInterface does not exist within the current scope"
    );
  }
}

async function evalScript(text, debug = false) {
  if (debug) {
    console.log("Invoking evalScript");
  }
  if (/file:\/\//i.test(document.location.origin.href)) {
    return await vanillaEvalscript(text, debug);
  }
  if (window.parent || /localhost/i.test(document.location.href)) {
    let result = await parentEvalScript(text, debug);
    let target = document.querySelector("iframe");
    if (debug) {
      console.log("Go to parent");
      console.log(document.location);
      console.log("TARGET:");
      console.log(target);
    }
    if (/localhost/i.test(document.location.href) && target) {
      if (debug) {
        console.log("Bounce back down, this is intermediary iframe");
      }
      target.contentWindow.postMessage(
        {
          evalScriptResult: result,
        },
        "*"
      );
      return result;
    } else {
      if (debug) {
        console.log("Don't bounce, this is last depth iframe");
        console.log(
          document.location.href,
          target,
          /localhost/i.test(document.location.href) && target
        );
      }
      return result;
    }
  } else {
    if (debug) {
      console.log("Vanilla");
    }
    return await vanillaEvalscript(text, debug);
  }
}

function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (err) {
    return false;
  }
}

async function parentEvalScript(text, debug = false) {
  return new Promise((resolve, reject) => {
    parent.postMessage(
      {
        evalScript: text,
        uuid: getUUID(),
      },
      "*"
    );
    window.addEventListener(
      "message",
      (evt) => {
        if (debug) {
          console.log(
            "PARENT EVALSCRIPT RESULT:",
            evt.data.data || evt.data.evalScriptResult
          );
          console.log(evt.data);
        }
        resolve(evt.data.evalScriptResult || evt.data.data);
      },
      { once: true }
    );
  });
}

function getUUID() {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { evalScript };
