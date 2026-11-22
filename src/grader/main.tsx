import { render } from "preact";
import { GraderReview } from "./GraderReview";
import "../styles.css";
import "./grader.css";

const root = document.getElementById("app");
if (!root) throw new Error('grader.html must contain <div id="app">');
render(<GraderReview />, root);
