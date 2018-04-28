import { Component } from "@angular/core";

import { DbService } from "./shared/db.service";

require('./helpers');

@Component({
  selector: "gr-main",
  template: "<page-router-outlet></page-router-outlet>"
})
export class AppComponent { 
  constructor(private dbService: DbService) {
    
    //initialize db
    this.dbService.getDatabase();
  }


}
