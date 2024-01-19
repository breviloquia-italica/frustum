import { Application } from "@hotwired/stimulus";
import MainController from "./controllers/main_controller";
import WordlistController from "./controllers/wordlist_controller";
import TimelineController from "./controllers/timeline_controller";
import MapController from "./controllers/map_controller";
import "./index.css";

const application = Application.start();
application.register("main", MainController);
application.register("wordlist", WordlistController);
application.register("timeline", TimelineController);
application.register("map", MapController);
application.debug = true;
