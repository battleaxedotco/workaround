# gideon

`evalScript` implementation to bypass CORS restrictions on new Adobe applications for use in `<iframe>` elements and bombino templates.

```bash
# Installation
npm i workaround
```

```js
// Usage:
import { evalScript } from "workaround";

// Within async/await
let result = await evalScript(`
  (
    function() {
      alert("Hello world");
      return true;
    }();
  )
`);
console.log(result); // Returns true, regardless of location or iframe depth
```

## Notes

- This is not a standalone package, and relies on a `window.addEventListener("message", callback)` on the topmost window of the document to function properly. If you're using any bombino template, this is already taken care of. To see the implementation necessary on the topmost window, view any `./public/index-dev.html` file of any bombino template (specifically the `<script>` tag containing `window.addEventListener` and callback).
