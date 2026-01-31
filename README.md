____   ___   ____  _______  __
  / ___| / _ \ |  _ \| ____\ \/ /
 | |    | | | || |_) |  _|  \  / 
 | |___ | |_| ||  _ <| |___ /  \ 
  \____| \___/ |_| \_\_____/_/\_\

             🔷 COREX 🔹


Corex.js
🔷 Minimalistic State Manager for Core  
🔹 Simple • 🔵 Flexible • 🔹 Lightweight  

---

🔵 Features
- 🔹 createStore — create store  
- 🔹 getState — access state  
- 🔹 dispatch — async / thunk support  
- 🔹 subscribe — listen to changes  
- 🔹 useStore — hook for components  
- 🔹 StoreProvider — context provider  
- 🔹 middleware — extensible logic chain  
- 🔹 combineReducers — reducer composition  

---

🔷 Quick Start
Copy corex.js into your project and import it in your app.

```js
import { createStore, combineReducers, StoreProvider, useStore } from "./corex.js";
```

---

🔵 Example Usage
```js
// Reducers
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case "increment": return { count: state.count + 1 };
    case "decrement": return { count: state.count - 1 };
    default: return state;
  }
}

function authReducer(state = { user: null }, action) {
  switch (action.type) {
    case "login": return { user: action.payload };
    case "logout": return { user: null };
    default: return state;
  }
}

// Root reducer + store
const rootReducer = combineReducers({ counter: counterReducer, auth: authReducer });
const store = createStore(rootReducer, { counter: { count: 0 }, auth: { user: null } });

// Component
function Counter() {
  const count = useStore(s => s.counter.count, store);
  return (
    <div>
      <p>🔵 Count: {count}</p>
      <button onClick={() => store.dispatch({ type: "increment" })}>+</button>
      <button onClick={() => store.dispatch({ type: "decrement" })}>-</button>
    </div>
  );
}
```

---

🔵 Recommendations
- Optimize subscriptions with Object.is or shallow compare.  
- Memoize selectors for heavy computations.  
- Add Redux DevTools integration via middleware.  
- Provide TypeScript typings for better DX.  
- Consider batching dispatches to reduce re-renders.  

---

🔷 License
MIT © Corex.js


