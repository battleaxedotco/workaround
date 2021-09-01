# Migration from CEP 10 > 11

## If you're using a bombino panel generated after SEPT 1, 2021 this does not affect you

---

To retroactively include the new CORS update for evalScript calls, all `evalScript` invocations in your panel should be from `workaround`, not `cluecumber` or `brutalism`.

`./public/index-dev.html` should include new lines:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>foo</title>

    <!-- SCRIPT HERE -->
    <script src="./CSInterface.js"></script>

    <!-- SCRIPT HERE -->
    <script>
      window.require = require || cep_node.require;
    </script>

    <!-- SCRIPT HERE -->
    <script src="./createEventChain.js"></script>
  </head>

  <body style="margin: 0; border: 0; overflow:hidden;">
    <iframe
      enable-nodejs
      src="http://localhost:8080"
      style="border: 0; width: 100vw; height: 100vh;"
    ></iframe>
  </body>
</html>
```

Once you've added the `SCRIPT HERE` callouts above, relaunching/refreshing your extension should mean that evalScript callbacks from within `DEV` context work correctly within any previous bombino template. See `createEventChain.js` in the root of this repo [here](./createEventChain.js).
