import { render } from "preact";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error('index.html must contain <div id="app">');
render(<App />, root);
